"use client";

import { useState, useTransition, type FormEvent } from "react";
import { KeyRoundIcon, MailIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorText, FIELD_CLASS } from "@/components/UserDashboard";
import { changeEmail, deleteAccount, requestPasswordChange } from "@/lib/account-actions";

// Solid red, for the one action that cannot be undone.
const DANGER_BUTTON_CLASS =
  "h-11 rounded-full bg-red-600 px-5 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500";

function ChangeEmailDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (email: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const email = value.trim().toLowerCase();
    setError(null);
    startTransition(async () => {
      const result = await changeEmail(email);
      if (result.ok) {
        setValue("");
        onChanged(email);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Stays open while the change is being saved.
        if (pending) return;
        setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Change email address</DialogTitle>
          <DialogDescription>
            You&apos;ll log in with the new address from now on. We&apos;ll send it a link to confirm it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <label htmlFor="new-email" className="text-sm text-muted-foreground">
            New email address
          </label>
          <input
            id="new-email"
            type="email"
            required
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="name@example.com"
            className={`${FIELD_CLASS} h-11 rounded-full`}
          />
          {error && <ErrorText>{error}</ErrorText>}
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" className="h-11 rounded-full px-5" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending || value.trim() === ""} className="h-11 rounded-full px-5">
              {pending ? "Saving…" : "Change email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Stays true after the account is gone, while the browser is sent to the logout route.
  const [deleted, setDeleted] = useState(false);
  const busy = pending || deleted;

  const onDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result.ok) {
        setDeleted(true);
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- /auth/logout is an Auth0 route that clears the session cookie, so it must be a full navigation
        window.location.href = "/auth/logout";
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-3xl p-6" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Delete your account?</DialogTitle>
          <DialogDescription>
            Your profile, pictures, saved events and everything you published will be removed for good.
            This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <ErrorText>{error}</ErrorText>}
        <DialogFooter>
          <DialogClose
            disabled={busy}
            render={<Button type="button" variant="outline" className="h-11 rounded-full px-5" />}
          >
            Keep my account
          </DialogClose>
          <Button type="button" disabled={busy} onClick={onDelete} className={DANGER_BUTTON_CLASS}>
            {busy ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountSettings({
  email: initialEmail,
  canChangeLogin,
}: {
  email: string;
  /** False for accounts that log in through Google etc.: their email and password live there. */
  canChangeLogin: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordPending, startPasswordTransition] = useTransition();

  const onChangePassword = () => {
    setNotice(null);
    setError(null);
    startPasswordTransition(async () => {
      const result = await requestPasswordChange();
      if (result.ok) setNotice(`We sent a link to change your password to ${email}.`);
      else setError(result.error);
    });
  };

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={!canChangeLogin}
            onClick={() => {
              setNotice(null);
              setError(null);
              setEmailOpen(true);
            }}
            className="h-11 rounded-full px-5"
          >
            <MailIcon />
            Change email address
          </Button>
          <Button
            variant="outline"
            disabled={!canChangeLogin || passwordPending}
            onClick={onChangePassword}
            className="h-11 rounded-full px-5"
          >
            <KeyRoundIcon />
            {passwordPending ? "Sending…" : "Change password"}
          </Button>
        </div>

        {!canChangeLogin && (
          <p className="mt-3 text-sm text-muted-foreground">
            You log in through another service (such as Google), so your email address and password
            are changed there.
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {notice}
          </p>
        )}
        {error && <ErrorText>{error}</ErrorText>}

        <dl className="mt-6 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="mt-1 font-medium break-all">{email || "—"}</dd>
        </dl>
      </section>

      <section className="rounded-3xl border border-red-600/40 bg-red-600/5 p-6">
        <h2 className="text-lg font-semibold tracking-tight text-red-600 dark:text-red-400">Delete account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Removes your account and everything in it for good. Afterwards you can sign up again with
          the same email address.
        </p>
        <Button onClick={() => setDeleteOpen(true)} className={`mt-5 ${DANGER_BUTTON_CLASS}`}>
          <Trash2Icon />
          Delete account
        </Button>
      </section>

      <ChangeEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        onChanged={(next) => {
          setEmail(next);
          setEmailOpen(false);
          setNotice(`Your email address is now ${next}. We sent it a link to confirm it.`);
        }}
      />
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
