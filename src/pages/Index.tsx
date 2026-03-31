import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, MessageSquareWarning, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const { profile, isAdmin } = useAuth();

  const { data: noticeCount } = useQuery({
    queryKey: ["notices-count"],
    queryFn: async () => {
      const { count } = await supabase.from("notices").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: complaintStats } = useQuery({
    queryKey: ["complaints-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("complaints").select("status");
      const pending = data?.filter((c) => c.status === "Pending").length ?? 0;
      const inProgress = data?.filter((c) => c.status === "In Progress").length ?? 0;
      const resolved = data?.filter((c) => c.status === "Resolved").length ?? 0;
      return { total: data?.length ?? 0, pending, inProgress, resolved };
    },
  });

  const { data: ruleCount } = useQuery({
    queryKey: ["rules-count"],
    queryFn: async () => {
      const { count } = await supabase.from("rules").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const cards = [
    {
      title: "Notices",
      description: `${noticeCount ?? 0} active notices`,
      icon: Megaphone,
      link: "/notices",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Complaints",
      description: `${complaintStats?.pending ?? 0} pending`,
      icon: MessageSquareWarning,
      link: "/complaints",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Rules",
      description: `${ruleCount ?? 0} society rules`,
      icon: BookOpen,
      link: "/rules",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome, {profile?.full_name || "Resident"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? "Manage your society from the admin panel" : "Stay updated with your society"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link key={card.title} to={card.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`h-12 w-12 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {complaintStats && complaintStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complaint Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-warning/10">
                <p className="text-2xl font-bold text-warning">{complaintStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{complaintStats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <p className="text-2xl font-bold text-success">{complaintStats.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
