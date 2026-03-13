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

    // Verify the user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to delete user data and auth account
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data from all tables
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
      { table: "post_images", column: "post_id", subquery: true },
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
      { table: "verification_requests", column: "user_id" },
    ];

    // Delete post_images for user's posts first
    const { data: userPosts } = await adminClient.from("posts").select("id").eq("user_id", user.id);
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map((p: any) => p.id);
      await adminClient.from("post_images").delete().in("post_id", postIds);
      await adminClient.from("post_tags").delete().in("post_id", postIds);
      await adminClient.from("comments").delete().in("post_id", postIds);
      await adminClient.from("likes").delete().in("post_id", postIds);
      await adminClient.from("saved_posts").delete().in("post_id", postIds);
    }

    for (const t of tables) {
      if (t.subquery) continue;
      await adminClient.from(t.table).delete().eq(t.column, user.id);
    }

    // Delete posts
    await adminClient.from("posts").delete().eq("user_id", user.id);
    
    // Delete profile
    await adminClient.from("profiles").delete().eq("user_id", user.id);

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
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
