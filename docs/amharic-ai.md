# Summarizing and organising Amharic notes

What Nota does today, which small AI models could do more, and how to handle
a model that is bigger than 1 GB. Researched 30 October 2026.

## What ships now: no model at all

**Summarize & organize** (the ✦ button above a note) works on the computer,
offline, with no download, using plain text measures instead of a language
model:

| Does | How | Code |
|---|---|---|
| Key sentences | TextRank over the note's sentences, compared on letter trigrams inside each word (Amharic glues prefixes and endings onto words, so `ስብሰባ` and `በስብሰባው` still match without a dictionary). About one sentence in five, up to four, never two that repeat each other. | `src/features/notes/lib/summarize.ts` |
| Paragraphs | A transcript arrives as one block. It is cut where the sentences on either side of a gap share the least (TextTiling), or evenly when there is no clear change of topic. | `split-paragraphs.ts` |
| Tags | Tags already in the library whose notes read most like this one (nested tag rather than its parent), then words the note keeps repeating that other notes rarely use, with common Amharic words and affixes set aside. | `suggest-tags.ts` |

Sentences and words are found with `Intl.Segmenter`, which knows the Ethiopic
full stop (`።`) and question mark (`፧`).

What it can't do: write new sentences. The summary is the note's own
sentences, chosen. That is also its strength: it never invents anything, and
it costs nothing in disk, memory or time.

## Models that could write real summaries

No Amharic summarizer under 1 GB has a published evaluation. These are the
closest candidates. Sizes are worked out from the parameter counts: 4 bytes
per weight at F32, 2 at F16, about 0.55 at 4-bit.

| Model | Size | Amharic | Catch |
|---|---|---|---|
| [rasyosef/Llama-3.2-400M-Amharic-Instruct](https://huggingface.co/rasyosef/Llama-3.2-400M-Amharic-Instruct) | 0.4B: 1.6 GB as published (F32), 0.8 GB F16, ~0.25 GB 4-bit | Trained from scratch on 274M Amharic tokens, then instruction-tuned | 1,024-token context; no evaluation or list of instruction tasks published |
| [rasyosef/Llama-3.2-1B-Amharic-Instruct](https://huggingface.co/rasyosef/Llama-3.2-1B-Amharic-Instruct) | ~1.2B: ~2.5 GB F16, **~0.8 GB 4-bit** | Llama 3.2 1B further trained on 300M Amharic tokens, with 16k Amharic tokens added to its vocabulary | No published evaluation |
| [csebuetnlp/mT5_multilingual_XLSum](https://huggingface.co/csebuetnlp/mT5_multilingual_XLSum) | mT5-base, ~580M: ~2.3 GB F32, ~0.6 GB int8 | Fine-tuned for summaries in 45 languages; Amharic ROUGE-1/2/L 20.1 / 7.4 / 18.1 on XL-Sum | Learned from BBC news (headline-like one-sentence summaries); licence CC BY-NC-SA 4.0, non-commercial |
| [Walia-LLM](https://aclanthology.org/2024.findings-emnlp.25.pdf) (LLaMA-2-Amharic) | 7B: ~4 GB even at 4-bit | Tuned on Amharic tasks, summarization included | Far over budget |
| Gemma 3 270M, Qwen3 0.6B | 0.2–1.2 GB | Multilingual, but no Amharic evaluation published | Unknown quality in Amharic |

[EthioLLM](https://arxiv.org/abs/2403.13737) models are encoders (they
understand text but don't write it): useful for tagging or search, not for
summaries.

## Recommendation

1. **Keep the built-in, model-free version as the default.** It is instant,
   works on every computer, and never puts words in the user's mouth.
2. **Offer "smart summaries" as an optional download in the setup guide**,
   the same way the speech models are set up: Llama-3.2-1B-Amharic-Instruct,
   quantized to 4-bit GGUF (about 0.8 GB, under the 1 GB budget), run with
   llama.cpp (Metal on Apple silicon, CPU elsewhere) through `llama-cpp-python`
   in the Python runtime Nota already installs for speech.
3. **Measure before shipping it.** No one has published how well it
   summarizes Amharic. Write reference summaries for 30–50 real notes and
   compare the model with the built-in summary (ROUGE, and a read by an Amharic
   speaker). Ship it only if it is clearly better.
4. **Feed it the extract, not the whole note.** Its context is short. Let the
   built-in summary pick the key sentences and paragraphs first, and ask the
   model to rewrite those. Long transcripts are summarized part by part, then
   the parts are summarized together.

## If the model is over 1 GB

- **Never put it in the installer.** Download it on demand from the setup
  guide, with progress, resume and a checksum, like Hohe and BuzzASR.
- **Quantize.** 4-bit GGUF cuts F16 weights to about a quarter, usually with
  little loss for summarization. A 2B model fits in about 1.2 GB.
- **Hold it in memory only while it works.** Load it on first use and release
  it after a few idle minutes; never keep it loaded alongside a speech model
  (Nota already does this for Hohe and BuzzASR).
- **Distil a small one.** The best size-to-quality path: fine-tune mT5-small
  (300M, about 0.3 GB at int8) on Amharic summaries: XL-Sum's Amharic set plus
  summaries of Amharic text written by a large model. Check the licence of each
  source first: XL-Sum is non-commercial.
- **Optional cloud, opt-in only.** A hosted model (Claude, for example)
  summarizes Amharic far better than anything that fits in 1 GB, but Nota
  promises to stay offline. If it is ever offered, it must be off by default,
  asked for per note, and say plainly that the text leaves the computer.
