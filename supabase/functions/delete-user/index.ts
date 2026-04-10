import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the calling user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if there's a target_user_id in the body (admin deleting another user)
    let targetUserId = callingUser.id;
    let body: any = {};
    try {
      body = await req.json();
    } catch { /* no body = self-delete */ }

    if (body?.target_user_id && body.target_user_id !== callingUser.id) {
      // Verify caller is admin
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: isAdmin } = await adminClient.rpc('is_super_admin', { _user_id: callingUser.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only admins can delete other users" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = body.target_user_id;
    }

    // Use service role to delete user data and auth account
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete post_images for user's posts first
    const { data: userPosts } = await adminClient.from("posts").select("id").eq("user_id", targetUserId);
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map((p: any) => p.id);
      await adminClient.from("post_images").delete().in("post_id", postIds);
      await adminClient.from("post_tags").delete().in("post_id", postIds);
      await adminClient.from("comments").delete().in("post_id", postIds);
      await adminClient.from("likes").delete().in("post_id", postIds);
      await adminClient.from("saved_posts").delete().in("post_id", postIds);
    }

    const tables = [
      { table: "message_reactions", column: "user_id" },
      { table: "messages", column: "sender_id" },
      { table: "conversation_participants", column: "user_id" },
      { table: "story_reactions", column: "user_id" },
      { table: "story_views", column: "viewer_id" },
      { table: "stories", column: "user_id" },
      { table: "comment_likes", column: "user_id" },
      { table: "comments", column: "user_id" },
      { table: "post_tags", column: "tagged_user_id" },
      { table: "likes", column: "user_id" },
      { table: "saved_posts", column: "user_id" },
      { table: "notifications", column: "user_id" },
      { table: "notifications", column: "actor_id" },
      { table: "follows", column: "follower_id" },
      { table: "follows", column: "following_id" },
      { table: "blocked_users", column: "blocker_id" },
      { table: "blocked_users", column: "blocked_id" },
      { table: "restricted_users", column: "restrictor_id" },
      { table: "restricted_users", column: "restricted_id" },
      { table: "user_thoughts", column: "user_id" },
      { table: "user_roles", column: "user_id" },
      { table: "user_bans", column: "user_id" },
      { table: "highlight_items", column: "highlight_id", subquery: true },
      { table: "highlights", column: "user_id" },
      { table: "verification_requests", column: "user_id" },
    ];

    // Delete highlight items first
    const { data: userHighlights } = await adminClient.from("highlights").select("id").eq("user_id", targetUserId);
    if (userHighlights && userHighlights.length > 0) {
      const highlightIds = userHighlights.map((h: any) => h.id);
      await adminClient.from("highlight_items").delete().in("highlight_id", highlightIds);
    }

    for (const t of tables) {
      if (t.subquery) continue;
      await adminClient.from(t.table).delete().eq(t.column, targetUserId);
    }

    // Delete posts
    await adminClient.from("posts").delete().eq("user_id", targetUserId);
    
    // Delete profile
    await adminClient.from("profiles").delete().eq("user_id", targetUserId);

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
