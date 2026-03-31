import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Phone, FileText } from "lucide-react";

const importantContacts = [
  { name: "Secretary", phone: "+91 98765 43210" },
  { name: "Security Guard", phone: "+91 98765 43211" },
];

export default function Rules() {
  const { data: rules, isLoading } = useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rules")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Society Rules</h1>
        <p className="text-muted-foreground">Guidelines for all residents of Vijay Garden</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (!rules || rules.length === 0) ? (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-3">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No rules posted yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule: any, idx: number) => (
            <Card key={rule.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  {rule.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rule.content}</p>
                {rule.rulebook_url && (
                  <a href={rule.rulebook_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />View Rulebook PDF
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Important Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {importantContacts.map((contact) => (
              <div key={contact.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{contact.name}</span>
                <a href={`tel:${contact.phone}`} className="text-sm text-primary hover:underline">
                  {contact.phone}
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
