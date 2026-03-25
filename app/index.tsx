import { useRouter } from "expo-router";

import { LandingHero } from "../components/LandingHero";
import businessProfile from "../data/businessProfile.json";

export default function Index() {
  const router = useRouter();

  return (
    <LandingHero
      businessName={businessProfile?.name || "Our Business"}
      tagline={businessProfile?.tagline || ""}
      location={businessProfile?.location || ""}
      onPressChat={() => router.push("/chat")}
    />
  );
}
