import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ATA_CODES } from "@/data/ata-codes";
import { Wrench, CheckCircle } from "lucide-react";

const maintenanceSchema = z.object({
  maintenanceType: z.string().min(1, "Maintenance type is required"),
  tsn: z.coerce.number().positive("Aircraft Total Hours must be positive"),
  ata: z.string().min(1, "ATA code is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

export default function ScheduledMaintenance() {
  const { toast } = useToast();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      maintenanceType: "",
      tsn: 0,
      ata: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      const response = await apiRequest("POST", "/api/maintenance/log", data);
      return await response.json();
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      form.reset();
      toast({
        title: "Success",
        description: "Maintenance log registered successfully.",
      });
      setTimeout(() => setSubmitSuccess(false), 3000);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to register maintenance log",
      });
    },
  });

  const onSubmit = (data: MaintenanceFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6" data-testid="page-scheduled-maintenance">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Wrench className="w-8 h-8 text-primary" />
          Scheduled Maintenance
        </h1>
        <p className="text-muted-foreground mt-2">Register maintenance and inspection tasks</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register Maintenance Task</CardTitle>
          <CardDescription>
            Log completed maintenance, inspections, or other aircraft tasks for record keeping
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitSuccess && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Maintenance log registered successfully</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="maintenanceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance/Inspection Type</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Routine Inspection, Component Replacement, Modification"
                          data-testid="input-maintenance-type"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tsn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aircraft Total Hours (TSN)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Aircraft total flight hours"
                          data-testid="input-tsn"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="ata"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ATA 100 Code</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ata-code">
                            <SelectValue placeholder="Select ATA system" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ATA_CODES.map((code: any) => (
                            <SelectItem key={code.code} value={code.code}>
                              {code.code} - {code.system}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          data-testid="input-maintenance-date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description of Task Performed</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed description of maintenance work completed, parts replaced, tests performed, etc."
                        className="min-h-32"
                        data-testid="textarea-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="w-full md:w-auto"
                data-testid="button-register-maintenance"
              >
                {mutation.isPending ? "Registering..." : "Register Maintenance"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
