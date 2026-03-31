import { useState, useRef } from "react";
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
import { Plus, Loader2, Trash2, ImagePlus, X, FileText, Upload } from "lucide-react";
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
  const [noticePhoto, setNoticePhoto] = useState<File | null>(null);
  const [noticePhotoPreview, setNoticePhotoPreview] = useState<string | null>(null);
  const noticeFileRef = useRef<HTMLInputElement>(null);

  // Rule form
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleContent, setRuleContent] = useState("");
  const [rulePdf, setRulePdf] = useState<File | null>(null);
  const rulePdfRef = useRef<HTMLInputElement>(null);

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

  // Notice photo handlers
  const handleNoticePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setNoticePhoto(file);
    setNoticePhotoPreview(URL.createObjectURL(file));
  };

  const clearNoticePhoto = () => {
    setNoticePhoto(null);
    setNoticePhotoPreview(null);
    if (noticeFileRef.current) noticeFileRef.current.value = "";
  };

  // Rule PDF handler
  const handleRulePdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setRulePdf(file);
  };

  const createNoticeMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null = null;

      if (noticePhoto && user) {
        const ext = noticePhoto.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("notice-photos")
          .upload(path, noticePhoto);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("notice-photos").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("notices").insert({
        title: noticeTitle,
        description: noticeDesc,
        created_by: user!.id,
        image_url: imageUrl,
      } as any);
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
      clearNoticePhoto();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      toast({ title: "Notice deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      let rulebookUrl: string | null = null;

      if (rulePdf && user) {
        const path = `${user.id}/${Date.now()}_${rulePdf.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("rule-documents")
          .upload(path, rulePdf);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("rule-documents").getPublicUrl(path);
        rulebookUrl = urlData.publicUrl;
      }

      const order = (allRules?.length ?? 0) + 1;
      const { error } = await supabase.from("rules").insert({
        title: ruleTitle,
        content: ruleContent,
        display_order: order,
        created_by: user!.id,
        rulebook_url: rulebookUrl,
      } as any);
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
      setRulePdf(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rules"] });
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      toast({ title: "Rule deleted" });
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
    <div className="space-y-6 mx-auto max-w-4xl w-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage notices, complaints, and rules</p>
      </div>

      <Tabs defaultValue="notices" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        {/* NOTICES TAB */}
        <TabsContent value="notices" className="space-y-4">
          <div className="flex justify-center">
            <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
              <DialogTrigger asChild>
                <Button size="lg"><Plus className="h-4 w-4 mr-2" />Add Notice</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Notice</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createNoticeMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} required placeholder="Notice title" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={noticeDesc} onChange={(e) => setNoticeDesc(e.target.value)} required rows={4} placeholder="Notice details..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Photo (optional)</Label>
                    <input ref={noticeFileRef} type="file" accept="image/*" className="hidden" onChange={handleNoticePhoto} />
                    {noticePhotoPreview ? (
                      <div className="relative w-full">
                        <img src={noticePhotoPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-border" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={clearNoticePhoto}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" className="w-full" onClick={() => noticeFileRef.current?.click()}>
                        <ImagePlus className="h-4 w-4 mr-2" />Attach Photo
                      </Button>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={createNoticeMutation.isPending}>
                    {createNoticeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Notice
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {(!allNotices || allNotices.length === 0) ? (
            <p className="text-center py-8 text-muted-foreground">No notices yet</p>
          ) : (
            <div className="space-y-3">
              {allNotices.map((n: any) => (
                <Card key={n.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{n.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{format(new Date(n.notice_date), "MMM d, yyyy")}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteNoticeMutation.mutate(n.id)}
                          disabled={deleteNoticeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{n.description}</p>
                    {n.image_url && (
                      <img src={n.image_url} alt="Notice photo" className="w-full max-w-md rounded-lg border border-border mx-auto" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* COMPLAINTS TAB */}
        <TabsContent value="complaints" className="space-y-4">
          {(!allComplaints || allComplaints.length === 0) ? (
            <p className="text-center py-8 text-muted-foreground">No complaints yet</p>
          ) : (
            <div className="space-y-3">
              {allComplaints.map((c: any) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{c.title}</CardTitle>
                        <CardDescription>
                          By {c.creator_name} · {format(new Date(c.created_at), "MMM d, yyyy")} · {c.category}
                        </CardDescription>
                      </div>
                      <Select
                        value={c.status}
                        onValueChange={(val) => updateStatusMutation.mutate({ id: c.id, status: val })}
                      >
                        <SelectTrigger className="w-[150px]">
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
                      <img src={c.image_url} alt="Complaint photo" className="w-full max-w-md rounded-lg border border-border mx-auto" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* RULES TAB */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-center">
            <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
              <DialogTrigger asChild>
                <Button size="lg"><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Society Rule</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createRuleMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={ruleTitle} onChange={(e) => setRuleTitle(e.target.value)} required placeholder="Rule title" />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea value={ruleContent} onChange={(e) => setRuleContent(e.target.value)} required rows={4} placeholder="Rule details..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Rulebook PDF (optional)</Label>
                    <input ref={rulePdfRef} type="file" accept=".pdf" className="hidden" onChange={handleRulePdf} />
                    {rulePdf ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm truncate flex-1">{rulePdf.name}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRulePdf(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" className="w-full" onClick={() => rulePdfRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />Attach PDF
                      </Button>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={createRuleMutation.isPending}>
                    {createRuleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Add Rule
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {(!allRules || allRules.length === 0) ? (
            <p className="text-center py-8 text-muted-foreground">No rules yet</p>
          ) : (
            <div className="space-y-3">
              {allRules.map((r: any, idx: number) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                        {r.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteRuleMutation.mutate(r.id)}
                        disabled={deleteRuleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{r.content}</p>
                    {r.rulebook_url && (
                      <a href={r.rulebook_url} target="_blank" rel="noopener noreferrer">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
