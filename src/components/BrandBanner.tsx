import brandImage from "@/assets/brand-banner-2.jpg";

export const BrandBanner = () => {
  return (
    <div className="w-full overflow-hidden">
      <img 
        src={brandImage} 
        alt="B More Crabby - We Climb Different" 
        className="w-full h-auto object-cover"
      />
    </div>
  );
};
