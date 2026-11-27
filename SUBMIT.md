# Gloz: submission

## Short description

**The problem.** The one message that matters arrives while you are in a meeting, walking or driving. Today that means taking out the phone, finding the chat, reading, typing and sending.

**Who it is for.** People whose work runs in Telegram, Slack or Discord chats and who need to answer the one message that matters without taking out the phone.

**How it works.** Only the chats you pick reach your Even G2. A new message arrives on the lens with its reply already drafted by AI, in the sender's language: who wrote, one line of what they want, and the reply. The most pressing message comes first. One tap on the glasses or the R1 ring sends it, with 2 seconds to take it back; double tap shows another of three drafts; swipe skips. Hold and say a few words to have the reply rewritten. Ten minutes before your next Google Calendar meeting, a card shows who and when, with "On my way." ready to send in the chat where that person last wrote. Keys and AI calls stay on your own Gloz server; the glasses app only talks to it, and message text is not stored after you reply.

**Track.** Main: 01 Messaging & News (Telegram, Slack, Discord). Second: 04 AI Assistants & Work (Google Calendar, for the meeting card, in the same flow). Also enters Best Telegram integration.

**Links.** Repository: https://github.com/drexthealpha/gloz. Live demo: https://drexthealpha.github.io/gloz/. Demo video: [app/demo-public/gloz-demo.mp4](app/demo-public/gloz-demo.mp4). Packaged build: [the latest gloz.ehpk](https://github.com/drexthealpha/gloz/releases/latest/download/gloz.ehpk).

## Feature requests (things the APIs we used were missing)

1. **Telegram: a read-only token for chosen chats of a user account.** Reading your own chats today needs a full account session (an API id, a hash and a login code). A scoped, revocable token for a few picked chats would let a glasses app read only those.
2. **Telegram Bot API: read receipts.** A bot cannot see or set whether a message was read, so a reply sent from the glasses leaves the chat unread on the phone.
3. **Slack: a visible "sent from a device or assistant" mark.** Message metadata carries who wrote a reply (Gloz uses it), but no Slack client shows it; a standard field the clients display would make AI-drafted replies plain to readers.
4. **Discord: direct messages with the user's consent.** Bots can only read and reply in servers, so Gloz cannot show or answer a Discord direct message. An OAuth scope a user grants for their own DMs would close that gap.
5. **Discord: post a reply as the user who approved it.** A bot can only post under its own name, so a reply sent from the glasses shows as the bot, and Gloz has to write "from <name> via G2" into it. A consented "on behalf of" post would show the reply as the person's own.

Owner: drexthealpha · reviewed 2026-11-27
