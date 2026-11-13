export const menu = [
  'Welcome to Studio Seraai — A Gallery Where Walls Breathe Art.',
  '',
  'How may we assist you?',
  '1. Explore Artworks',
  '2. Meet Our Artists',
  '3. Book a Private Viewing',
  '4. Exhibitions & Events',
  '5. Speak to Our Team',
  '',
  'Reply with a number from 1 to 5. Type MENU to return here.',
].join('\n');

export function answerFor(input: string): string {
  const normalized = input.trim().toLowerCase();
  const key = normalized.replace(/[^a-z0-9 ]/g, '').trim();
  switch (key) {
    case '1':
    case 'art':
    case 'artworks':
      return 'Explore the Studio Seraai collection at https://studioseraai.com. Tell us the artwork name or ID you like, and our team will assist you.\n\nReply MENU for options.';
    case '2':
    case 'artists':
    case 'artist':
      return 'Discover artists represented by Studio Seraai at https://studioseraai.com. Share an artist name to request their collection.\n\nReply MENU for options.';
    case '3':
    case 'viewing':
    case 'private viewing':
      return 'We would love to arrange a private viewing. Please share your preferred date, time, and number of visitors. A team member will confirm availability.\n\nReply MENU for options.';
    case '4':
    case 'exhibition':
    case 'exhibitions':
    case 'events':
      return 'For upcoming exhibitions and events, visit https://studioseraai.com or tell us which exhibition interests you.\n\nReply MENU for options.';
    case '5':
    case 'human':
    case 'team':
    case 'agent':
      return 'Thank you. Your request to speak with the Studio Seraai team has been noted. A team member will respond when available.\n\nReply MENU for options.';
    default:
      return menu;
  }
}
