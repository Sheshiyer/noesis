import React from "react";
import { ProfileForm } from "./components/profile-form";
import { useDashboardSnapshot } from "./lib/use-dashboard-snapshot";

export default function ProfileCommand() {
  const { snapshot, isLoading } = useDashboardSnapshot();

  if (!snapshot && isLoading) {
    return <ProfileForm snapshot={null} />;
  }

  return <ProfileForm snapshot={snapshot} />;
}
