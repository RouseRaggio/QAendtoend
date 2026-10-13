import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EvidenceDropzone, EvidenceDraft } from '../components/EvidenceDropzone';
import { AuthProvider } from '../context/AuthContext';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

const createFakeImageFile = (name = 'screenshot.png', type = 'image/png') => {
  return new File(['dummy-image-binary-data'], name, { type });
};

describe('EvidenceDropzone Component with Clipboard Paste Support', () => {
  it('renders the paste prompt and instruction properly', () => {
    const handleChange = vi.fn();
    render(
      <Wrapper>
        <EvidenceDropzone evidenceList={[]} onChange={handleChange} />
      </Wrapper>
    );

    expect(screen.getByText(/Paste screenshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl \+ V/i)).toBeInTheDocument();
  });

  it('detects and handles valid clipboard image paste (Ctrl+V)', () => {
    const handleChange = vi.fn();
    const fakeFile = createFakeImageFile('test_clip.png', 'image/png');

    const { container } = render(
      <Wrapper>
        <EvidenceDropzone evidenceList={[]} onChange={handleChange} />
      </Wrapper>
    );

    const pasteZone = container.querySelector('[tabindex=\"0\"]')!;
    expect(pasteZone).toBeInTheDocument();

    // Mock clipboard event with valid image item
    const clipboardItem = {
      type: 'image/png',
      getAsFile: () => fakeFile,
    };

    fireEvent.paste(pasteZone, {
      clipboardData: {
        items: [clipboardItem],
      },
    });

    expect(handleChange).toHaveBeenCalledTimes(1);
    const addedEvidence = handleChange.mock.calls[0][0];
    expect(addedEvidence).toHaveLength(1);
    expect(addedEvidence[0].file.type).toBe('image/png');
    expect(addedEvidence[0].description).toBe('Captura pegada desde el portapapeles');
  });

  it('ignores non-image clipboard paste (e.g. text/plain) without adding evidence items', () => {
    const handleChange = vi.fn();

    const { container } = render(
      <Wrapper>
        <EvidenceDropzone evidenceList={[]} onChange={handleChange} />
      </Wrapper>
    );

    const pasteZone = container.querySelector('[tabindex=\"0\"]')!;

    // Paste text only
    const textItem = {
      type: 'text/plain',
      getAsFile: () => null,
    };

    fireEvent.paste(pasteZone, {
      clipboardData: {
        items: [textItem],
      },
    });

    expect(handleChange).not.toHaveBeenCalled();
    // Verify toast notification appears
    expect(screen.getByText(/No image found in clipboard/i)).toBeInTheDocument();
  });

  it('supports multiple pasted screenshots with descriptions and individual deletion', () => {
    const handleChange = vi.fn();
    const initialList: EvidenceDraft[] = [
      {
        id: 'ev-1',
        file: createFakeImageFile('screen1.png', 'image/png'),
        previewUrl: 'blob:fake-url-1',
        description: 'First failure step'
      },
      {
        id: 'ev-2',
        file: createFakeImageFile('screen2.webp', 'image/webp'),
        previewUrl: 'blob:fake-url-2',
        description: 'Console log output'
      }
    ];

    render(
      <Wrapper>
        <EvidenceDropzone evidenceList={initialList} onChange={handleChange} />
      </Wrapper>
    );

    expect(screen.getByDisplayValue('First failure step')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Console log output')).toBeInTheDocument();

    // Delete first screenshot
    const deleteButtons = screen.getAllByText(/Eliminar/i);
    expect(deleteButtons).toHaveLength(2);

    fireEvent.click(deleteButtons[0]);
    expect(handleChange).toHaveBeenCalledWith([initialList[1]]);
  });
});
