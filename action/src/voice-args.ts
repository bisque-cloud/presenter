// Which voice flags the Action hands to `present.mjs publish`.
//
// The `voice` input is an override, so it is passed as `--voice`, which
// outranks everything. Left empty, the Action passes no voice of its own: the
// skill narrates in the voice saved for the channel, else the account, on
// bisque.cloud, and installs that engine on the runner. `--fallback-voice` is
// only the voice for an account that has saved none, the one this Action
// always narrated in, so a workflow that never set a voice keeps publishing.
// The skill uses it only once it has read the account and found no voice: if
// bisque.cloud cannot be read, the run fails rather than narrate in it.

export const FALLBACK_VOICE = "kokoro:af_heart";

export function voiceArgs(input: string | undefined): string[] {
  const voice = (input ?? "").trim();
  if (!voice) return ["--fallback-voice", FALLBACK_VOICE];
  if (!voice.includes(":")) {
    throw new Error(
      `voice must be engine-qualified, like kokoro:af_heart; got '${voice}'. Run 'bisque-voice engines' for the engine ids, or leave voice empty to use the voice saved on bisque.cloud.`,
    );
  }
  return ["--voice", voice];
}
