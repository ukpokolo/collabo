import { Card } from '@/components/ui/Surface';
import { TextLink } from '@/components/ui/TextLink';

export default function NotFound() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <p className="font-mono text-3xl font-bold text-primary">404</p>
        <h1 className="mt-2 text-lg font-semibold text-foreground">Page not found</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          That page doesn&apos;t exist, or the task was deleted.
        </p>
        <p className="mt-5 text-sm">
          <TextLink href="/">Back to the board</TextLink>
        </p>
      </Card>
    </div>
  );
}
