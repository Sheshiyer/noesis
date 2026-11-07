import React, { useEffect, useState } from "react";
import { List } from "@raycast/api";
import AccountCommand from "./account";
import { getStoredConfig } from "./lib/settings";
import { ProfileForm } from "./components/profile-form";
import { useDashboardSnapshot } from "./lib/use-dashboard-snapshot";
function LocalDefaults() {
  const { snapshot, isLoading } = useDashboardSnapshot();
  if (isLoading && !snapshot) return <List isLoading />;
  return (
    <ProfileForm key={snapshot?.profile?.id ?? "guest"} snapshot={snapshot} />
  );
}
export default function ProfileCommand() {
  const [account, setAccount] = useState<boolean>();
  useEffect(() => {
    getStoredConfig().then((config) =>
      setAccount(config?.authMode === "account"),
    );
  }, []);
  return account === undefined ? (
    <List isLoading />
  ) : account ? (
    <AccountCommand />
  ) : (
    <LocalDefaults />
  );
}
