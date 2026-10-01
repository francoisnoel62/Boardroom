import React from 'react';
import { render, Text } from 'ink';

/** Rendering adapter only; the application service owns all project/meeting state. */
export async function displayTranscript(text: string): Promise<void> {
  const view = render(<Text>{text}</Text>, { patchConsole: false });
  await view.waitUntilRenderFlush();
  view.unmount();
  await view.waitUntilExit();
}
