import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";

import story1 from "@/assets/story1.jpg";
import story2 from "@/assets/story2.jpg";
import story3 from "@/assets/story3.jpg";
import story4 from "@/assets/story4.jpg";
import explore1 from "@/assets/explore1.jpg";
import explore2 from "@/assets/explore2.jpg";
import explore4 from "@/assets/explore4.jpg";

type Status = "follow" | "requested" | "following";

interface UserItem {
  username: string;
  displayName: string;
  avatar: string;
  verified?: boolean;
  status: Status;
}

const initialUsers: UserItem[] = [
  { username: "hemlata", displayName: "Hemu Patel", avatar: story1, verified: true, status: "follow" },
  { username: "zeel.jogiwala", displayName: "zeel🦋", avatar: story2, status: "requested" },
  { username: "dhrumilvanani14", displayName: "Dhrumil", avatar: story3, status: "requested" },
  { username: "rae", displayName: "rajvee", avatar: story4, status: "requested" },
  { username: "farryjust", displayName: "farry", avatar: explore1, verified: true, status: "follow" },
  { username: "_parth_22", displayName: "Parth Diyora", avatar: explore2, status: "follow" },
  { username: "kevin_sheta_97", displayName: "Er. Kevin Sheta", avatar: explore4, status: "follow" },
];

const Following = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState(initialUsers);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (username: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.username !== username) return u;
        if (u.status === "follow") return { ...u, status: "following" as Status };
        if (u.status === "following") return { ...u, status: "follow" as Status };
        if (u.status === "requested") return { ...u, status: "follow" as Status };
        return u;
      })
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <button onClick={() => navigate("/feed")} className="font-semibold text-foreground">
          Done
        </button>
      </div>

      <div className="px-4 pb-4">
        <h1 className="text-3xl font-extrabold leading-tight text-foreground">
          Discover People
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Follow people to see their posts on your Timeline.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5">
          <PuffyIcon name="search" size={18} className="opacity-50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="divide-y divide-border">
        {filtered.map((user, i) => (
          <motion.div
            key={user.username}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <img src={user.avatar} alt={user.username} className="h-12 w-12 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1 font-bold text-foreground">
                {user.username}
                {user.verified && <span className="text-primary">✓</span>}
              </p>
              <p className="text-sm text-muted-foreground">{user.displayName}</p>
            </div>
            <button
              onClick={() => toggleStatus(user.username)}
              className={`flex items-center gap-1 rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                user.status === "following"
                  ? "bg-secondary text-secondary-foreground"
                  : user.status === "requested"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {user.status === "following" ? (
                <>
                  <PuffyIcon name="check" size={14} /> Following
                </>
              ) : user.status === "requested" ? (
                <>
                  <PuffyIcon name="check" size={14} /> Requested
                </>
              ) : (
                <>
                  <PuffyIcon name="plus" size={14} /> Follow
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Following;
