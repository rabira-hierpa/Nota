import type { CommandId } from "@shared/keymap";

type Handler = () => void;

const handlers = new Map<CommandId, Set<Handler>>();

/**
 * Where commands meet the components that can carry them out. A command
 * arrives from the menu or a shortcut (useCommands); whichever component owns
 * the needed state (the open note's editor, the recorder) registers a handler
 * while it is mounted. Returns a function that unregisters.
 */
export function onCommand(command: CommandId, handler: Handler): () => void {
  const set = handlers.get(command) ?? new Set<Handler>();
  set.add(handler);
  handlers.set(command, set);
  return () => {
    set.delete(handler);
  };
}

/** Runs a command; false when nothing on screen can run it right now. */
export function runCommand(command: CommandId): boolean {
  const set = handlers.get(command);
  if (!set || set.size === 0) return false;
  for (const handler of set) handler();
  return true;
}
