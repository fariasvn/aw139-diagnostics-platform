import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, UserCog, Phone, CheckCircle, XCircle } from "lucide-react";

interface Expert {
  id: string;
  tenantId: string;
  name: string;
  role: string;
  specialty: string;
  specialties: string | null;
  background: string | null;
  experience: string;
  whatsappNumber: string | null;
  available: number;
  availability: string;
  imageUrl: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface ExpertFormData {
  name: string;
  role: string;
  specialty: string;
  specialties: string;
  background: string;
  experience: string;
  whatsappNumber: string;
  available: boolean;
  imageUrl: string;
}

const defaultFormData: ExpertFormData = {
  name: "",
  role: "Specialist",
  specialty: "",
  specialties: "",
  background: "",
  experience: "",
  whatsappNumber: "",
  available: true,
  imageUrl: "",
};

export default function AdminExperts() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [formData, setFormData] = useState<ExpertFormData>(defaultFormData);

  const { data: experts = [], isLoading } = useQuery<Expert[]>({
    queryKey: ["/api/admin/experts"],
  });

  const createMutation = useMutation({
    mutationFn: (data: ExpertFormData) => apiRequest("POST", "/api/admin/experts", {
      ...data,
      available: data.available ? 1 : 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/experts"] });
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Expert created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create expert", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpertFormData> }) => 
      apiRequest("PATCH", `/api/admin/experts/${id}`, {
        ...data,
        available: data.available ? 1 : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/experts"] });
      setEditingExpert(null);
      setFormData(defaultFormData);
      toast({ title: "Expert updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update expert", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/experts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/experts"] });
      toast({ title: "Expert deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete expert", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/experts/${id}/toggle-availability`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/experts"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to toggle availability", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (expert: Expert) => {
    setEditingExpert(expert);
    setFormData({
      name: expert.name,
      role: expert.role || "Specialist",
      specialty: expert.specialty,
      specialties: expert.specialties || "",
      background: expert.background || "",
      experience: expert.experience,
      whatsappNumber: expert.whatsappNumber || "",
      available: expert.available === 1,
      imageUrl: expert.imageUrl || "",
    });
  };

  // Filter out soft-deleted experts for display
  const activeExperts = experts.filter(e => !e.deletedAt);

  const handleSubmit = () => {
    if (editingExpert) {
      updateMutation.mutate({ id: editingExpert.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCloseDialog = () => {
    setIsCreateOpen(false);
    setEditingExpert(null);
    setFormData(defaultFormData);
  };

  const ExpertForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Dr. John Smith"
            data-testid="input-expert-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Input
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="e.g., Senior Specialist"
            data-testid="input-expert-role"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="specialty">Primary Specialty *</Label>
          <Input
            id="specialty"
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            placeholder="e.g., ATA 24 Electrical"
            data-testid="input-expert-specialty"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experience">Experience Summary *</Label>
          <Input
            id="experience"
            value={formData.experience}
            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            placeholder="20+ years AW139"
            data-testid="input-expert-experience"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="specialties">ATA Specialties (comma-separated)</Label>
        <Input
          id="specialties"
          value={formData.specialties}
          onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
          placeholder="24, 31, 32, 71"
          data-testid="input-expert-specialties"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="background">Background & Certifications</Label>
        <Textarea
          id="background"
          value={formData.background}
          onChange={(e) => setFormData({ ...formData, background: e.target.value })}
          placeholder="Detailed background, certifications, previous experience..."
          className="min-h-[80px]"
          data-testid="input-expert-background"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
          <Input
            id="whatsappNumber"
            value={formData.whatsappNumber}
            onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
            placeholder="+1234567890"
            data-testid="input-expert-whatsapp"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="imageUrl">Profile Image URL</Label>
          <Input
            id="imageUrl"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://..."
            data-testid="input-expert-image"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="available"
          checked={formData.available}
          onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
          data-testid="switch-expert-available"
        />
        <Label htmlFor="available">Available for consultations</Label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UserCog className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">MCC Experts</h1>
              <p className="text-sm text-muted-foreground">Manage expert roster and availability</p>
            </div>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-expert">
                <Plus className="w-4 h-4 mr-2" />
                Add Expert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" data-testid="dialog-create-expert">
              <DialogHeader>
                <DialogTitle>Add New Expert</DialogTitle>
              </DialogHeader>
              <ExpertForm />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                </DialogClose>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!formData.name || !formData.specialty || !formData.experience || createMutation.isPending}
                  data-testid="button-save-expert"
                >
                  {createMutation.isPending ? "Creating..." : "Create Expert"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading experts...</div>
        ) : activeExperts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserCog className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No experts configured yet.</p>
              <p className="text-sm text-muted-foreground">Click "Add Expert" to create your first expert.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeExperts.map((expert) => (
              <Card key={expert.id} className="hover-elevate" data-testid={`card-expert-${expert.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={expert.imageUrl || undefined} alt={expert.name} />
                      <AvatarFallback className="text-lg font-semibold">
                        {expert.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{expert.name}</h3>
                        <Badge 
                          variant="outline"
                          className={expert.available === 1 
                            ? "border-green-600 bg-green-500/15 text-green-700 dark:text-green-400 dark:border-green-500 dark:bg-green-500/20" 
                            : "border-red-600 bg-red-500/15 text-red-700 dark:text-red-400 dark:border-red-500 dark:bg-red-500/20"}
                        >
                          {expert.available === 1 ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Available</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-1" /> Unavailable</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{expert.role} - {expert.experience}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">{expert.specialty}</Badge>
                        {expert.whatsappNumber && (
                          <Badge variant="outline" className="text-xs">
                            <Phone className="w-3 h-3 mr-1" />
                            {expert.whatsappNumber}
                          </Badge>
                        )}
                      </div>
                      {expert.background && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{expert.background}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMutation.mutate(expert.id)}
                        disabled={toggleMutation.isPending}
                        data-testid={`button-toggle-${expert.id}`}
                      >
                        {expert.available === 1 ? "Set Unavailable" : "Set Available"}
                      </Button>
                      
                      <Dialog open={editingExpert?.id === expert.id} onOpenChange={(open) => !open && handleCloseDialog()}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(expert)} data-testid={`button-edit-${expert.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg" data-testid="dialog-edit-expert">
                          <DialogHeader>
                            <DialogTitle>Edit Expert</DialogTitle>
                          </DialogHeader>
                          <ExpertForm />
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                            </DialogClose>
                            <Button 
                              onClick={handleSubmit} 
                              disabled={!formData.name || !formData.specialty || !formData.experience || updateMutation.isPending}
                              data-testid="button-update-expert"
                            >
                              {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteMutation.mutate(expert.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${expert.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
