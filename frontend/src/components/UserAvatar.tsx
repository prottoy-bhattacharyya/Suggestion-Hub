import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string;
  src?: string | null | undefined;
  className?: string | undefined;
  fallbackClassName?: string | undefined;
};

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({ name, src, className, fallbackClassName }: UserAvatarProps) {
  return (
    <Avatar className={cn("bg-primary text-primary-foreground", className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback
        className={cn("bg-primary font-display text-primary-foreground", fallbackClassName)}
      >
        {initialsFor(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
