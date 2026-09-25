import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import PostCard from "@/components/PostCard";
import { usePosts } from "@/hooks/usePosts";
import { ShimmerPostCard } from "@/components/ShimmerLoader";

const Welcome = () => {
  const navigate = useNavigate();
  const { posts, loading } = usePosts();
  const [showGate, setShowGate] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setShowGate(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const avatars = posts
    .map((p) => p.avatar_url)
    .filter((a, i, arr): a is string => !!a && arr.indexOf(a) === i)
    .slice(0, 5);

  return (
    <div className="relative min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <h1 className="text-reveal text-2xl text-foreground">Revealme.</h1>
        <button
          onClick={() => navigate("/login")}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
        >
          Sign In
        </button>
      </header>

      <main className={`mx-auto max-w-lg transition-[filter] duration-500 ${showGate ? "pointer-events-none blur-[3px]" : ""}`} aria-hidden={showGate}>
        {loading ? (
          <>
            <ShimmerPostCard />
            <ShimmerPostCard />
          </>
        ) : posts.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          posts.slice(0, 20).map((post) => (
            <PostCard
              key={post.id}
              postId={post.id}
              postUserId={post.user_id}
              username={post.username}
              displayName={post.display_name}
              avatar={post.avatar_url || ""}
              verified={post.is_verified}
              image={post.image_url}
              caption={post.caption}
              likesCount={post.likesCount}
              timeAgo={post.timeAgo}
              location={post.location}
              postType={post.post_type}
            />
          ))
        )}
      </main>

      <AnimatePresence>
        {showGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 px-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-title"
          >
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card p-7 text-center shadow-2xl"
            >
              <h2 id="gate-title" className="text-2xl font-bold leading-tight text-card-foreground">
                See what's happening on <span className="text-reveal font-normal">Revealme.</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">Sign in to start.</p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate("/login")}
                  className="rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="rounded-2xl bg-foreground py-3 text-sm font-semibold text-background active:scale-[0.98]"
                >
                  Create new account
                </button>
              </div>

              {avatars.length > 0 && (
                <div className="mt-7 flex items-end justify-center gap-3">
                  {avatars.map((src, i) => (
                    <motion.img
                      key={src}
                      src={src}
                      alt=""
                      className="avatar-leaf h-12 w-12 object-cover shadow-md"
                      style={{ marginBottom: i % 2 ? 12 : 0 }}
                      animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                      transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Welcome;
