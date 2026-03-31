import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  "In Progress": "bg-primary/10 text-primary border-primary/20",
  Resolved: "bg-success/10 text-success border-success/20",
};

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Notice form
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeDesc, setNoticeDesc] = useState("");

  // Rule form
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleContent, setRuleContent] = useState("");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  const { data: allComplaints } = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: async () => {
      const { data: complaintsData, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profile names for complaint creators
      const userIds = [...new Set((complaintsData || []).map((c) => c.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p) => { nameMap[p.user_id] = p.full_name; });

      return (complaintsData || []).map((c) => ({
        ...c,
        creator_name: nameMap[c.created_by] || "Unknown",
      }));
    },
  });

  const { data: allNotices } = useQuery({
    queryKey: ["admin-notices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notices").select("*").order("notice_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allRules } = useQuery({
    queryKey: ["admin-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rules").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const createNoticeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notices").insert({
        title: noticeTitle,
        description: noticeDesc,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["notices-count"] });
      toast({ title: "Notice created" });
      setNoticeOpen(false);
      setNoticeTitle("");
      setNoticeDesc("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const order = (allRules?.length ?? 0) + 1;
      const { error } = await supabase.from("rules").insert({
        title: ruleTitle,
        content: ruleContent,
        display_order: order,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rules"] });
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["rules-count"] });
      toast({ title: "Rule added" });
      setRuleOpen(false);
      setRuleTitle("");
      setRuleContent("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("complaints").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["my-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["complaints-stats"] });
      toast({ title: "Status updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage notices, complaints, and rules</p>
      </div>

      <Tabs defaultValue="notices">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        {/* NOTICES TAB */}
        <TabsContent value="notices" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Notice</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Notice</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createNoticeMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={noticeDesc} onChange={(e) => setNoticeDesc(e.target.value)} required rows={4} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createNoticeMutation.isPending}>
                    {createNoticeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Notice
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {allNotices?.map((n) => (
            <Card key={n.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-base">{n.title}</CardTitle>
                  <Badge variant="secondary">{format(new Date(n.notice_date), "MMM d, yyyy")}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{n.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* COMPLAINTS TAB */}
        <TabsContent value="complaints" className="space-y-4">
          {allComplaints?.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <CardDescription>
                      By {c.creator_name} · {format(new Date(c.created_at), "MMM d, yyyy")} · {c.category}
                    </CardDescription>
                  </div>
                  <Select
                    value={c.status}
                    onValueChange={(val) => updateStatusMutation.mutate({ id: c.id, status: val })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <Badge variant="outline" className={statusColors[c.status]}>{c.status}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{c.description}</p>
                {c.image_url && (
                  <img src={c.image_url} alt="Complaint photo" className="w-full max-w-sm rounded-lg border border-border" />
                )}
              </CardContent>
            </Card>
          ))}
          {(!allComplaints || allComplaints.length === 0) && (
            <p className="text-center py-8 text-muted-foreground">No complaints yet</p>
          )}
        </TabsContent>

        {/* RULES TAB */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Society Rule</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createRuleMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={ruleTitle} onChange={(e) => setRuleTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea value={ruleContent} onChange={(e) => setRuleContent(e.target.value)} required rows={4} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createRuleMutation.isPending}>
                    {createRuleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Add Rule
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {allRules?.map((r, idx) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                  {r.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{r.content}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
