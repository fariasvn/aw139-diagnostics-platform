import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, Plus, Trash2, Wrench, Package } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const partReplacementSchema = z.object({
  partOffPn: z.string().min(1, "Part OFF P/N required"),
  partOffSn: z.string().optional(),
  partOffDescription: z.string().optional(),
  partOnPn: z.string().min(1, "Part ON P/N required"),
  partOnSn: z.string().optional(),
  partOnDescription: z.string().optional(),
});

const resolutionFormSchema = z.object({
  solution: z.string().min(10, "Solution description must be at least 10 characters"),
  replacedParts: z.array(partReplacementSchema).optional().default([]),
});

type ResolutionFormData = z.infer<typeof resolutionFormSchema>;

interface ResolutionFormProps {
  troubleshootingId: string;
  problemDescription: string;
  aiSuggestion?: string;
  onSuccess?: () => void;
}

export default function ResolutionForm({ 
  troubleshootingId, 
  problemDescription,
  aiSuggestion,
  onSuccess 
}: ResolutionFormProps) {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ResolutionFormData>({
    resolver: zodResolver(resolutionFormSchema),
    defaultValues: {
      solution: "",
      replacedParts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "replacedParts",
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ResolutionFormData) => {
      const response = await apiRequest("POST", `/api/troubleshooting/${troubleshootingId}/solution`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Solution Saved",
        description: "Troubleshooting resolution has been recorded successfully.",
      });
      setIsSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/troubleshooting/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/parts"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save solution",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResolutionFormData) => {
    submitMutation.mutate(data);
  };

  const addReplacedPart = () => {
    append({
      partOffPn: "",
      partOffSn: "",
      partOffDescription: "",
      partOnPn: "",
      partOnSn: "",
      partOnDescription: "",
    });
  };

  if (isSubmitted) {
    return (
      <Card data-testid="card-resolution-submitted">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Resolution Recorded</h3>
            <p className="text-muted-foreground">
              This troubleshooting case has been saved to the historical database.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-resolution-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Record Solution
        </CardTitle>
        <CardDescription>
          Document the resolution and any parts replaced for this troubleshooting case
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="p-4 rounded-md bg-muted/50 mb-4">
              <Label className="text-xs text-muted-foreground uppercase">Problem</Label>
              <p className="text-sm mt-1">{problemDescription}</p>
            </div>

            <FormField
              control={form.control}
              name="solution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solution Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the solution applied to resolve this issue..."
                      className="min-h-[120px]"
                      data-testid="input-solution"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <Label>Replaced Parts</Label>
                  {fields.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {fields.length} part{fields.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addReplacedPart}
                  data-testid="button-add-part"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Part
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                  No parts replaced. Click "Add Part" if components were replaced.
                </p>
              )}

              {fields.map((field, index) => (
                <div 
                  key={field.id} 
                  className="p-4 border rounded-md space-y-4"
                  data-testid={`part-replacement-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Part #{index + 1}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      data-testid={`button-remove-part-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 p-3 bg-destructive/5 rounded-md">
                      <Label className="text-xs uppercase text-destructive">Part OFF (Removed)</Label>
                      <FormField
                        control={form.control}
                        name={`replacedParts.${index}.partOffPn`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Part Number (P/N)" 
                                data-testid={`input-part-off-pn-${index}`}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`replacedParts.${index}.partOffSn`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Serial Number (S/N) - Optional" 
                                data-testid={`input-part-off-sn-${index}`}
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`replacedParts.${index}.partOffDescription`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Description - Optional" 
                                data-testid={`input-part-off-desc-${index}`}
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-3 p-3 bg-green-500/5 rounded-md">
                      <Label className="text-xs uppercase text-green-600">Part ON (Installed)</Label>
                      <FormField
                        control={form.control}
                        name={`replacedParts.${index}.partOnPn`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Part Number (P/N)" 
                                data-testid={`input-part-on-pn-${index}`}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`replacedParts.${index}.partOnSn`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Serial Number (S/N) - Optional" 
                                data-testid={`input-part-on-sn-${index}`}
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`replacedParts.${index}.partOnDescription`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Description - Optional" 
                                data-testid={`input-part-on-desc-${index}`}
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending}
              data-testid="button-submit-solution"
            >
              {submitMutation.isPending ? "Saving..." : "Save Resolution"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
