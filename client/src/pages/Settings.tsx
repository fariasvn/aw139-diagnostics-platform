import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Settings as SettingsIcon, Bell, Shield, Database, Globe } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your application preferences</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive alerts and updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="expert-notifications">Expert Consultation Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when expert validation is recommended</p>
              </div>
              <Switch id="expert-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenance-alerts">Scheduled Maintenance Reminders</Label>
                <p className="text-sm text-muted-foreground">Receive reminders for upcoming maintenance tasks</p>
              </div>
              <Switch id="maintenance-alerts" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inventory-alerts">Low Inventory Warnings</Label>
                <p className="text-sm text-muted-foreground">Alert when parts fall below minimum stock levels</p>
              </div>
              <Switch id="inventory-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Safety Thresholds
            </CardTitle>
            <CardDescription>Configure diagnostic certainty requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Expert Consultation Threshold</Label>
                <p className="text-sm text-muted-foreground">Diagnoses below 95% certainty require expert validation</p>
              </div>
              <span className="font-mono text-lg font-semibold text-primary">95%</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="strict-mode">Strict Safety Mode</Label>
                <p className="text-sm text-muted-foreground">Always require expert sign-off for critical ATA codes</p>
              </div>
              <Switch id="strict-mode" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data & Storage
            </CardTitle>
            <CardDescription>Manage diagnostic history and cached data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Diagnostic History Retention</Label>
                <p className="text-sm text-muted-foreground">Keep diagnostic records for compliance</p>
              </div>
              <span className="text-sm text-muted-foreground">365 days</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-sync">Auto-sync with Fleet Database</Label>
                <p className="text-sm text-muted-foreground">Automatically synchronize fleet status data</p>
              </div>
              <Switch id="auto-sync" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Settings
            </CardTitle>
            <CardDescription>Configure locale and measurement preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Measurement Units</Label>
                <p className="text-sm text-muted-foreground">Display measurements in preferred units</p>
              </div>
              <span className="text-sm text-muted-foreground">Metric (SI)</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Time Zone</Label>
                <p className="text-sm text-muted-foreground">Used for maintenance scheduling</p>
              </div>
              <span className="text-sm text-muted-foreground">UTC-3 (São Paulo)</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Reset to Defaults</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
