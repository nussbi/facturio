"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertTriangle, RefreshCw, Wifi, WifiOff, XCircle } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function NetworkError({ title, description, onRetry, retryLabel }: ErrorStateProps) {
  const { t } = useLanguage();
  return (
    <Alert variant="destructive">
      <WifiOff className="h-4 w-4" />
      <AlertTitle>{title ?? t("error.connectionError")}</AlertTitle>
      <AlertDescription className="mt-2">
        {description ?? t("error.unableConnect")}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryLabel ?? t("error.tryAgain")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function FormError({ title, description }: Pick<ErrorStateProps, "title" | "description">) {
  const { t } = useLanguage();
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title ?? t("error.validationError")}</AlertTitle>
      <AlertDescription>{description ?? t("error.correctErrors")}</AlertDescription>
    </Alert>
  );
}

export function EmptyState({ 
  title, 
  description, 
  action,
  icon: Icon = XCircle
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <CardTitle className="text-center mb-2">{title}</CardTitle>
        <CardDescription className="text-center mb-4">
          {description}
        </CardDescription>
        {action}
      </CardContent>
    </Card>
  );
}

export function NotFound({ 
  title, 
  description, 
  homeUrl = "/"
}: {
  title?: string;
  description?: string;
  homeUrl?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center text-center">
      <div className="text-6xl font-bold text-muted-foreground mb-4">404</div>
      <h1 className="text-2xl font-semibold mb-2">{title ?? t("error.pageNotFound")}</h1>
      <p className="text-muted-foreground mb-6 max-w-md">{description ?? t("error.pageNotFoundDesc")}</p>
      <Button asChild>
        <Link href={homeUrl}>{t("error.goHome")}</Link>
      </Button>
    </div>
  );
}

export function GenericError({ 
  title, 
  description, 
  onRetry,
  retryLabel
}: ErrorStateProps) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <CardTitle className="text-center mb-2">{title ?? t("error.somethingWrong")}</CardTitle>
        <CardDescription className="text-center mb-4">
          {description ?? t("error.unexpectedError")}
        </CardDescription>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryLabel ?? t("error.tryAgain")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
