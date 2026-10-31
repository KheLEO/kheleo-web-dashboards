"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BracketRegistrationModal } from "@/components/athlete/BracketRegistrationModal";
import { useBrackets, useTournament } from "./queries";
export function RegistrationDialog({
  tournamentId,
  bracketId,
}: {
  tournamentId: string;
  bracketId: string;
}) {
  const [open, setOpen] = useState(false);
  const tournament = useTournament(tournamentId);
  const brackets = useBrackets(tournamentId);
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!tournament.data || !brackets.data}>
        Register for this bracket
      </Button>
      {open && tournament.data && brackets.data && (
        <BracketRegistrationModal
          tournamentId={tournamentId}
          tournamentName={tournament.data.name || tournament.data.title}
          sport={tournament.data.sport}
          currency={tournament.data.currency}
          prizePool={tournament.data.prizePool}
          selectedBracketId={bracketId}
          brackets={brackets.data.pages
            .flatMap((page) => page.data)
            .map((bracket) => ({
              ...bracket,
              minGti: Number(bracket.minGti),
              maxGti: Number(bracket.maxGti),
            }))}
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
