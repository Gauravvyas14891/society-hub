import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Megaphone } from "lucide-react";
import { format } from "date-fns";

export default function Notices() {
  const { data: notices, isLoading } = useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("notice_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading notices...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Notices</h1>
        <p className="text-muted-foreground">Stay updated with the latest society announcements</p>
      </div>

      {(!notices || notices.length === 0) ? (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-3">
            <Megaphone className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No notices posted yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <Card key={notice.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{notice.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {format(new Date(notice.notice_date), "MMM d, yyyy")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notice.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
