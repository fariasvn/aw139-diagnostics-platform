import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Video, Phone, Clock, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Expert {
  id?: string;
  name: string;
  role?: string | null;
  experience: string;
  specialty: string;
  specialties?: string | null;
  background?: string | null;
  whatsappNumber?: string | null;
  available?: number;
  availability?: "AVAILABLE" | "UNAVAILABLE" | string;
  imageUrl?: string | null;
}

interface ExpertBookingCardProps {
  experts: Expert[];
  reason: string;
}

export default function ExpertBookingCard({ experts, reason }: ExpertBookingCardProps) {
  const { toast } = useToast();
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [isContactLoading, setIsContactLoading] = useState(false);

  const isExpertAvailable = (expert: Expert) => {
    if (expert.available !== undefined) return expert.available === 1;
    return expert.availability === "AVAILABLE";
  };

  const handleWhatsAppContact = async (expert: Expert) => {
    if (!expert.id) {
      toast({
        title: "Contact unavailable",
        description: "Expert contact information is not configured.",
        variant: "destructive",
      });
      return;
    }

    setIsContactLoading(true);
    try {
      const response = await fetch(`/api/experts/contact?expertId=${expert.id}&method=whatsapp`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get contact information");
      }

      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        toast({
          title: "WhatsApp not available",
          description: data.message || "This expert has no WhatsApp configured.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Contact failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsContactLoading(false);
    }
  };

  const handleVideoCall = async (expert: Expert) => {
    if (!expert.id) {
      toast({
        title: "Video call unavailable",
        description: "Expert contact information is not configured.",
        variant: "destructive",
      });
      return;
    }

    setIsContactLoading(true);
    try {
      const response = await fetch(`/api/experts/contact?expertId=${expert.id}&method=video`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate video call");
      }

      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        toast({
          title: "Video calling coming soon",
          description: data.message || "Video conferencing integration is being set up.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Video call failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsContactLoading(false);
    }
  };

  return (
    <Card className="border-destructive/50 bg-destructive/5" data-testid="card-expert-booking">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold text-destructive">MCC Expert Support Recommended</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{reason}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {experts.map((expert, index) => {
            const available = isExpertAvailable(expert);
            return (
              <div 
                key={expert.id || index} 
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-md border bg-card hover-elevate"
                data-testid={`expert-${index}`}
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={expert.imageUrl || undefined} alt={expert.name} />
                    <AvatarFallback className="text-sm font-semibold">
                      {expert.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold">{expert.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {expert.role ? `${expert.role} - ` : ""}{expert.experience}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {expert.specialty}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${available 
                          ? "border-green-600 bg-green-500/15 text-green-700 dark:text-green-400 dark:border-green-500 dark:bg-green-500/20" 
                          : "border-red-600 bg-red-500/15 text-red-700 dark:text-red-400 dark:border-red-500 dark:bg-red-500/20"}`}
                      >
                        {available ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Available</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" /> Unavailable</>
                        )}
                      </Badge>
                    </div>
                    {expert.background && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 hidden sm:block">
                        {expert.background}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
                  <Button 
                    size="sm"
                    variant="outline"
                    disabled={!available || isContactLoading}
                    onClick={() => handleWhatsAppContact(expert)}
                    className="flex-1 sm:flex-initial"
                    data-testid={`button-whatsapp-${index}`}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    <span className="sm:hidden">WhatsApp</span>
                    <span className="hidden sm:inline">Chat</span>
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm"
                        disabled={!available}
                        onClick={() => setSelectedExpert(expert)}
                        className="flex-1 sm:flex-initial"
                        data-testid={`button-contact-${index}`}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        <span className="sm:hidden">Call</span>
                        <span className="hidden sm:inline">Video</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md" data-testid="dialog-booking">
                      <DialogHeader>
                        <DialogTitle>Contact {expert.name}</DialogTitle>
                        <DialogDescription>
                          Choose how you'd like to reach this expert
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex items-center gap-4 p-3 rounded-md border bg-muted/50">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={expert.imageUrl || undefined} alt={expert.name} />
                            <AvatarFallback>{expert.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{expert.name}</p>
                            <p className="text-sm text-muted-foreground">{expert.specialty}</p>
                          </div>
                        </div>
                        
                        <div className="grid gap-3">
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleWhatsAppContact(expert)}
                            disabled={isContactLoading}
                            data-testid="button-dialog-whatsapp"
                          >
                            <MessageCircle className="w-4 h-4 mr-3 text-green-600" />
                            <div className="text-left">
                              <p className="font-medium">WhatsApp Message</p>
                              <p className="text-xs text-muted-foreground">Chat directly with expert</p>
                            </div>
                          </Button>
                          
                          <Button
                            className="w-full justify-start"
                            onClick={() => handleVideoCall(expert)}
                            disabled={isContactLoading}
                            data-testid="button-dialog-video"
                          >
                            <Video className="w-4 h-4 mr-3" />
                            <div className="text-left">
                              <p className="font-medium">Video Consultation</p>
                              <p className="text-xs text-muted-foreground opacity-80">Live video call with screen sharing</p>
                            </div>
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
