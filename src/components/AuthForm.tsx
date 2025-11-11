import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100),
  username: z.string().trim().min(3, { message: "Username must be at least 3 characters" }).max(50).optional(),
  displayName: z.string().trim().max(100).optional(),
});

interface AuthFormProps {
  onSuccess: () => void;
}

const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user arrived via password recovery link
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setIsForgotPassword(false);
        setIsLogin(false);
      }
    });
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = z.string().email().safeParse(email);
      if (!validation.success) {
        throw new Error("Please enter a valid email address");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link. Click the link in your email to reset your password.",
      });
      setIsForgotPassword(false);
      setEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords don't match");
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password updated successfully",
        description: "You can now sign in with your new password.",
      });

      setIsRecoveryMode(false);
      setIsLogin(true);
      setPassword("");
      setConfirmPassword("");
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validation = authSchema.safeParse({
        email,
        password,
        username: !isLogin ? username : undefined,
        displayName: !isLogin ? displayName : undefined,
      });

      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
        onSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name: displayName || username,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Welcome to the creator community.",
        });
        onSuccess();
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : "An error occurred";
      
      // Handle specific database errors
      const errMsg = error instanceof Error ? error.message : "";
      if (errMsg.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        errorMessage = "This username is already taken. Please choose a different username.";
      } else if (errMsg.includes('duplicate key value violates unique constraint')) {
        errorMessage = "This email or username is already registered. Please try signing in instead.";
      } else if (errMsg.includes('Database error saving new user')) {
        errorMessage = "Unable to create account. The username or email may already be in use.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-glow bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-hero bg-clip-text text-transparent">
          {isRecoveryMode ? "Set New Password" : isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Join Us"}
        </CardTitle>
        <CardDescription>
          {isRecoveryMode 
            ? "Enter your new password below" 
            : isForgotPassword 
            ? "Enter your email to receive a reset link" 
            : isLogin 
            ? "Sign in to your account" 
            : "Create your creator account"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isRecoveryMode ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {password && <PasswordStrengthIndicator password={password} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-hero hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        ) : isForgotPassword ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-hero hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setEmail("");
                }}
                className="text-primary hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="@username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {!isLogin && password && (
              <PasswordStrengthIndicator password={password} />
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-hero hover:opacity-90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
          <div className="text-center text-sm space-y-2">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline block w-full"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
            {isLogin && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                Forgot password?
              </button>
            )}
          </div>
        </form>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthForm;
