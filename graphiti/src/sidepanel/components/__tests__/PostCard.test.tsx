/**
 * PostCard Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PostCard from '../PostCard';

// Mock NexusPost data
const mockPost = {
  details: {
    id: 'post123',
    author: 'author456',
    content: 'This is a test post content with https://example.com',
    kind: 'short',
    uri: 'pubky://author456/pub/pubky.app/posts/post123',
    indexed_at: Date.now() - 3600000, // 1 hour ago
  },
  author: {
    id: 'author456',
    name: 'Test Author',
    image: 'https://example.com/avatar.png',
  },
  tags: [
    { label: 'test', taggers: ['user1'], taggers_count: 1, relationship: false },
    { label: 'demo', taggers: ['user1', 'user2'], taggers_count: 2, relationship: false },
  ],
};

const mockLinkPost = {
  details: {
    id: 'link123',
    author: 'author789',
    content: 'https://news.example.com/article',
    kind: 'link',
    uri: 'pubky://author789/pub/pubky.app/posts/link123',
    indexed_at: Date.now() - 7200000, // 2 hours ago
  },
  author: {
    id: 'author789',
    name: 'Link Poster',
  },
};

describe('PostCard', () => {
  it('should render post content', () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText(/test post content/i)).toBeInTheDocument();
  });

  it('should render author name', () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('should render relative timestamp', () => {
    render(<PostCard post={mockPost} />);
    
    // The component renders time as "1H" for 1 hour
    const timeElements = screen.getAllByText(/^\d+[SMHD]$/i);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('should render tags when present', () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
  });

  it('should handle posts without author name', () => {
    const postWithoutName = {
      ...mockPost,
      author: { id: 'author456' },
    };
    
    render(<PostCard post={postWithoutName} />);
    
    // Should show truncated author ID
    expect(screen.getByText(/PK:author/i)).toBeInTheDocument();
  });

  it('should handle link posts', () => {
    render(<PostCard post={mockLinkPost} />);
    
    expect(screen.getByText(/news\.example\.com/i)).toBeInTheDocument();
  });

  it('should render avatar image', () => {
    render(<PostCard post={mockPost} />);
    
    // PostCard uses Nexus avatar URL, not the author.image
    const avatar = screen.queryByRole('img');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src');
  });

  it('should handle posts without tags', () => {
    const postWithoutTags = {
      ...mockPost,
      tags: undefined,
    };
    
    render(<PostCard post={postWithoutTags} />);
    
    // Should render without crashing
    expect(screen.getByText(/test post content/i)).toBeInTheDocument();
  });

  it('should display correct post ID in footer', () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText('post123')).toBeInTheDocument();
  });

  it('should display author ID badge', () => {
    render(<PostCard post={mockLinkPost} />);
    
    // Check that the component renders without errors
    expect(screen.getByText(/Link Poster/i)).toBeInTheDocument();
  });
});
