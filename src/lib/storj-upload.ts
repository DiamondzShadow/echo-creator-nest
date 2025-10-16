/**
 * Storj S3 Upload Utility
 * 
 * This utility provides functions to upload files to Storj using the S3 API.
 * It supports both browser-based uploads and server-side uploads.
 */

export interface StorjUploadConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  region?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  path: string;
  bucket: string;
  url?: string;
  error?: string;
}

/**
 * Generate AWS Signature V4 for S3 requests
 */
async function generateSignature(
  method: string,
  url: string,
  headers: Record<string, string>,
  payload: string,
  credentials: { accessKeyId: string; secretAccessKey: string },
  region: string = 'us-east-1'
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Create canonical request
  const canonicalUri = new URL(url).pathname;
  const canonicalQueryString = '';
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}`)
    .join('\n');
  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';');
  
  // Hash payload
  const payloadHash = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  const payloadHashHex = Array.from(new Uint8Array(payloadHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    '',
    signedHeaders,
    payloadHashHex
  ].join('\n');
  
  // Create string to sign
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const credentialScope = `${date}/${region}/s3/aws4_request`;
  
  const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    credentialScope,
    canonicalRequestHashHex
  ].join('\n');
  
  // Calculate signature
  const kDate = await hmacSHA256(encoder.encode(`AWS4${credentials.secretAccessKey}`), date);
  const kRegion = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, 's3');
  const kSigning = await hmacSHA256(kService, 'aws4_request');
  const signature = await hmacSHA256(kSigning, stringToSign);
  
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;
}

async function hmacSHA256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

/**
 * Upload a file to Storj using S3 API (browser-based)
 */
export async function uploadToStorj(
  file: File,
  path: string,
  config: StorjUploadConfig,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const endpoint = config.endpoint || 'https://gateway.storjshare.io';
  const region = config.region || 'us-east-1';
  
  try {
    const url = `${endpoint}/${config.bucket}${path}`;
    
    // For browser uploads, we'll use a simpler approach with pre-signed URLs
    // In production, you should generate pre-signed URLs on your backend
    
    const headers: Record<string, string> = {
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Length': file.size.toString(),
    };
    
    // Create form data for multipart upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: (e.loaded / e.total) * 100
          });
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            path,
            bucket: config.bucket,
            url: `${endpoint}/${config.bucket}${path}`
          });
        } else {
          resolve({
            success: false,
            path,
            bucket: config.bucket,
            error: `Upload failed with status ${xhr.status}`
          });
        }
      });
      
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          path,
          bucket: config.bucket,
          error: 'Network error during upload'
        });
      });
      
      xhr.open('PUT', url);
      
      // Set headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      
      // Note: In production, you should handle authentication properly
      // This is a simplified example
      xhr.send(file);
    });
  } catch (error) {
    return {
      success: false,
      path,
      bucket: config.bucket,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a pre-signed URL for uploading to Storj
 * This should be called from your backend/edge function
 */
export async function generatePresignedUploadUrl(
  path: string,
  config: StorjUploadConfig,
  expiresIn: number = 3600
): Promise<string> {
  const endpoint = config.endpoint || 'https://gateway.storjshare.io';
  const region = config.region || 'us-east-1';
  
  const url = new URL(`${endpoint}/${config.bucket}${path}`);
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  
  url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  url.searchParams.set('X-Amz-Credential', `${config.accessKeyId}/${new Date().toISOString().split('T')[0].replace(/-/g, '')}/${region}/s3/aws4_request`);
  url.searchParams.set('X-Amz-Date', new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''));
  url.searchParams.set('X-Amz-Expires', expiresIn.toString());
  url.searchParams.set('X-Amz-SignedHeaders', 'host');
  
  // Generate signature
  const stringToSign = `AWS4-HMAC-SHA256\n${url.searchParams.get('X-Amz-Date')}\n${url.searchParams.get('X-Amz-Credential')?.split('/').slice(1).join('/')}\n${await hashString(url.toString())}`;
  
  // Simplified signature (in production, use proper AWS Signature V4)
  url.searchParams.set('X-Amz-Signature', 'PLACEHOLDER');
  
  return url.toString();
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Upload file using a pre-signed URL
 */
export async function uploadWithPresignedUrl(
  file: File,
  presignedUrl: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percentage: (e.loaded / e.total) * 100
        });
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const url = new URL(presignedUrl);
        resolve({
          success: true,
          path: url.pathname,
          bucket: url.pathname.split('/')[1] || '',
          url: presignedUrl.split('?')[0]
        });
      } else {
        resolve({
          success: false,
          path: '',
          bucket: '',
          error: `Upload failed with status ${xhr.status}`
        });
      }
    });
    
    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        path: '',
        bucket: '',
        error: 'Network error during upload'
      });
    });
    
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}
