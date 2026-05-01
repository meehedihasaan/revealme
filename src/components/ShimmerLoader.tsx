const ShimmerBlock = ({ className }: { className?: string }) => (
  <div aria-hidden="true" className={`shimmer-block rounded-lg ${className || ""}`} />
);

export const FeedShimmer = () => (
  <div className="space-y-4 px-4 py-4">
    {[...Array(2)].map((_, i) => (
      <div key={i} className="space-y-3">
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-9 w-9 avatar-leaf" />
          <ShimmerBlock className="h-3 w-28" />
          <div className="flex-1" />
          <ShimmerBlock className="h-3 w-6" />
        </div>
        <ShimmerBlock className="h-72 w-full rounded-none" />
        <div className="flex gap-4">
          <ShimmerBlock className="h-6 w-6 rounded-md" />
          <ShimmerBlock className="h-6 w-6 rounded-md" />
          <ShimmerBlock className="h-6 w-6 rounded-md" />
          <div className="flex-1" />
          <ShimmerBlock className="h-6 w-6 rounded-md" />
        </div>
        <ShimmerBlock className="h-3 w-20" />
        <ShimmerBlock className="h-3 w-48" />
        <ShimmerBlock className="h-2 w-16" />
      </div>
    ))}
  </div>
);

export const ProfileShimmer = () => (
  <div className="space-y-4">
    <ShimmerBlock className="h-48 w-full rounded-none" />
    <div className="px-4 space-y-3">
      <ShimmerBlock className="h-20 w-20 rounded-xl -mt-10" />
      <ShimmerBlock className="h-5 w-40" />
      <ShimmerBlock className="h-3 w-24" />
      <div className="flex gap-6">
        <ShimmerBlock className="h-4 w-20" />
        <ShimmerBlock className="h-4 w-20" />
        <ShimmerBlock className="h-4 w-16" />
      </div>
      <ShimmerBlock className="h-3 w-36" />
      <ShimmerBlock className="h-10 w-full rounded-lg" />
    </div>
    <div className="flex border-b border-border">
      <div className="flex-1 py-3 flex justify-center"><ShimmerBlock className="h-5 w-5" /></div>
      <div className="flex-1 py-3 flex justify-center"><ShimmerBlock className="h-5 w-5" /></div>
    </div>
    <div className="grid grid-cols-3 gap-0.5">
      {[...Array(9)].map((_, i) => (
        <ShimmerBlock key={i} className="aspect-square w-full rounded-none" />
      ))}
    </div>
  </div>
);

export const MessagesShimmer = () => (
  <div className="space-y-0">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <ShimmerBlock className="h-14 w-14 avatar-leaf shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-3.5 w-28" />
          <ShimmerBlock className="h-3 w-44" />
        </div>
        <ShimmerBlock className="h-3 w-8" />
      </div>
    ))}
  </div>
);

export const ExploreShimmer = () => (
  <div className="grid grid-cols-3 gap-0.5">
    {[...Array(12)].map((_, i) => (
      <ShimmerBlock key={i} className={`aspect-square w-full rounded-none ${i === 0 ? "col-span-2 row-span-2" : ""}`} />
    ))}
  </div>
);

export const ChatShimmer = () => (
  <div className="flex-1 space-y-3 px-4 py-4">
    {[...Array(8)].map((_, i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
        <ShimmerBlock className={`h-10 rounded-2xl ${i % 3 === 0 ? "w-48" : i % 3 === 1 ? "w-32" : "w-40"}`} />
      </div>
    ))}
  </div>
);

export const SettingsShimmer = () => (
  <div className="space-y-0 divide-y divide-border">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-start gap-4 px-4 py-5">
        <ShimmerBlock className="h-6 w-6 rounded-md mt-0.5" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-4 w-28" />
          <ShimmerBlock className="h-3 w-48" />
        </div>
        <ShimmerBlock className="h-4 w-4 mt-1" />
      </div>
    ))}
  </div>
);

export const NotificationsShimmer = () => (
  <div className="divide-y divide-border">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <ShimmerBlock className="h-12 w-12 avatar-leaf shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-3.5 w-44" />
          <ShimmerBlock className="h-3 w-12" />
        </div>
        <ShimmerBlock className="h-5 w-5 rounded-md" />
      </div>
    ))}
  </div>
);

export const FollowersShimmer = () => (
  <div className="space-y-0">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <ShimmerBlock className="h-12 w-12 avatar-leaf shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-3.5 w-28" />
          <ShimmerBlock className="h-3 w-20" />
        </div>
        <ShimmerBlock className="h-8 w-20 rounded-lg" />
      </div>
    ))}
  </div>
);

export const EditProfileShimmer = () => (
  <div className="space-y-4 px-4 py-4">
    <ShimmerBlock className="h-48 w-full rounded-none -mx-4" />
    <div className="flex justify-center -mt-14">
      <ShimmerBlock className="h-24 w-24 rounded-2xl" />
    </div>
    {[...Array(4)].map((_, i) => (
      <div key={i} className="space-y-2">
        <ShimmerBlock className="h-3 w-20" />
        <ShimmerBlock className="h-10 w-full rounded-lg" />
      </div>
    ))}
  </div>
);

export default ShimmerBlock;
