import { useState, useEffect } from 'react';
import { storage, ProfileData } from '../../utils/storage';
import { profileManager } from '../../utils/profile-manager';
import { logger } from '../../utils/logger';
import { validateProfile, VALIDATION_LIMITS } from '../../utils/validation';
import ProgressBar from './ProgressBar';
import ImageCropper from './ImageCropper';

// Common emojis for the picker
const COMMON_EMOJIS = [
  '😊', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫',
  '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳',
  '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎',
  '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟',
  '🔥', '💫', '⭐', '🌟', '✨', '⚡', '💥', '💢', '💦', '💨',
  '🎉', '🎊', '🎁', '🎈', '🎀', '🏆', '🥇', '🥈', '🥉',
  '🚀', '🛸', '🌙', '⭐', '🌈', '☀️', '⛅', '🌤️', '🌥️', '☁️',
  '💻', '📱', '⌨️', '🖥️', '🖱️', '🎮', '🎧', '🎵', '🎸', '🎹',
  '📚', '📖', '📝', '✏️', '📌', '📍', '✅', '❌', '⭕', '🔴',
];

export function ProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCropper, setShowCropper] = useState(false);
  const [imageFileToCrop, setImageFileToCrop] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Form state - Now matches Pubky App standard profile.json
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState('');
  const [status, setStatus] = useState('');
  const [links, setLinks] = useState<Array<{ title: string; url: string }>>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const session = await storage.getSession();
      
      if (!session) {
        showMessage('error', 'Not authenticated');
        setLoading(false);
        return;
      }

      logger.info('ProfileEditor', 'Loading profile from homeserver');
      
      // Fetch profile.json directly from homeserver (same as Pubky App reads)
      const profileData = await profileManager.fetchProfileJSON(session.pubky);

      if (profileData) {
        setName(profileData.name || '');
        setBio(profileData.bio || '');
        setImage(profileData.image || '');
        setStatus(profileData.status || '');
        setLinks(profileData.links || []);
        logger.info('ProfileEditor', 'Profile loaded from homeserver', profileData);
      } else {
        // No profile exists yet, try to fetch from Nexus as default
        logger.info('ProfileEditor', 'No profile.json found, fetching from Nexus');
        try {
          const { nexusClient } = await import('../../utils/nexus-client');
          const userData = await nexusClient.getUser(session.pubky);
          
          setName(userData.name || session.pubky.substring(0, 16));
          setBio(userData.bio || '');
          setImage(userData.image || '');
          setStatus('👋 Pubky User');
          setLinks(userData.links || []);
          
          logger.info('ProfileEditor', 'Loaded defaults from Nexus');
        } catch (nexusError) {
          logger.warn('ProfileEditor', 'Could not load from Nexus, using basic defaults');
          setName(session.pubky.substring(0, 16));
          setStatus('👋 Pubky User');
        }
      }

      setLoading(false);
    } catch (error) {
      logger.error('ProfileEditor', 'Failed to load profile', error as Error);
      showMessage('error', 'Failed to load profile');
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Get session first
      const session = await storage.getSession();
      if (!session) {
        showMessage('error', 'Not authenticated. Please sign in first.');
        return;
      }

      // Filter out empty links
      const validLinks = links.filter(link => link.title.trim() && link.url.trim());

      // Use centralized validation
      const profileValidation = validateProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        status: status.trim() || undefined,
        image: image.trim() || undefined,
        links: validLinks.length > 0 ? validLinks : undefined,
      });

      if (!profileValidation.valid) {
        showMessage('error', profileValidation.error || 'Invalid profile data');
        return;
      }

      // Create profile data using Pubky App standard format
      const profileData: ProfileData = {
        name: name.trim(),
        bio: bio.trim() || undefined,
        image: image.trim() || undefined,
        status: status.trim() || undefined,
        links: validLinks.length > 0 ? validLinks : undefined,
      };

      // Save using ProfileManager (saves both profile.json and generates index.html)
      logger.info('ProfileEditor', 'Saving profile');
      const success = await profileManager.saveProfile(session.pubky, profileData);

      if (success) {
        logger.info('ProfileEditor', 'Profile saved successfully');
        showMessage('success', 'Profile saved successfully! Both profile.json and index.html updated.');
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      logger.error('ProfileEditor', 'Failed to save profile', error as Error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    if (links.length >= VALIDATION_LIMITS.PROFILE_LINKS_MAX_COUNT) {
      showMessage('error', `Maximum ${VALIDATION_LIMITS.PROFILE_LINKS_MAX_COUNT} links allowed`);
      return;
    }
    setLinks([...links, { title: '', url: '' }]);
  };

  const updateLink = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const validateImageFile = (file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please select an image file');
      return false;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Image must be smaller than 5MB');
      return false;
    }

    return true;
  };

  const handleImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateImageFile(file)) return;

    // Show cropper for avatar images (square aspect ratio)
    setImageFileToCrop(file);
    setShowCropper(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!validateImageFile(file)) return;

    // Show cropper for avatar images (square aspect ratio)
    setImageFileToCrop(file);
    setShowCropper(true);
  };

  const handleCropComplete = async (croppedFile: File) => {
    setShowCropper(false);
    setImageFileToCrop(null);

    try {
      setUploading(true);
      setUploadProgress(0);
      setMessage(null);

      const session = await storage.getSession();
      if (!session) {
        showMessage('error', 'Not authenticated');
        return;
      }

      logger.info('ProfileEditor', 'Uploading cropped image', { size: croppedFile.size, type: croppedFile.type });

      // Use imageHandler to upload with progress callback
      const { imageHandler } = await import('../../utils/image-handler');
      const timestamp = Date.now();
      const extension = croppedFile.name.split('.').pop() || 'jpg';
      const filename = `avatar-${timestamp}.${extension}`;
      
      const imagePath = await imageHandler.uploadImage(
        croppedFile, 
        session.pubky, 
        filename,
        (progress) => setUploadProgress(progress)
      );

      if (imagePath) {
        setImage(imagePath); // Set the path like /pub/pubky.app/files/avatar-123.jpg
        showMessage('success', 'Image uploaded successfully!');
        logger.info('ProfileEditor', 'Image uploaded', { path: imagePath });
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      logger.error('ProfileEditor', 'Failed to upload image', error as Error);
      showMessage('error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">Edit Profile</h2>

      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="profile-name">
            Name * <span className="text-xs text-gray-500">({name.length}/{VALIDATION_LIMITS.PROFILE_NAME_MAX_LENGTH})</span>
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, VALIDATION_LIMITS.PROFILE_NAME_MAX_LENGTH))}
            maxLength={VALIDATION_LIMITS.PROFILE_NAME_MAX_LENGTH}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Your display name"
            aria-label="Display name"
            aria-required="true"
            aria-describedby="name-help"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Bio <span className="text-xs text-gray-500">({bio.length}/{VALIDATION_LIMITS.PROFILE_BIO_MAX_LENGTH})</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, VALIDATION_LIMITS.PROFILE_BIO_MAX_LENGTH))}
            maxLength={VALIDATION_LIMITS.PROFILE_BIO_MAX_LENGTH}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Tell us about yourself..."
            aria-label="Bio"
          />
        </div>

        {/* Avatar/Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Avatar Image
          </label>
          
          {/* Image Preview */}
          {image && (
            <div className="mb-3 flex items-center gap-3">
              <img
                src={image}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setImage('')}
                className="text-sm text-red-400 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                aria-label="Remove avatar image"
              >
                Remove
              </button>
            </div>
          )}

          {/* Upload Button with Drag and Drop */}
          <div 
            className={`space-y-2 border-2 border-dashed rounded-lg p-4 transition-colors ${
              isDragging 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-600 bg-gray-800/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex gap-2">
              <label className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center cursor-pointer hover:bg-gray-600 focus-within:ring-2 focus-within:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  disabled={uploading}
                  className="hidden"
                  aria-label="Upload avatar image"
                />
                {uploading ? 'Uploading...' : '📤 Upload Image'}
              </label>
            </div>
            {uploading && (
              <ProgressBar 
                progress={uploadProgress} 
                label="Uploading image"
                className="mt-2"
              />
            )}
            {!uploading && (
              <p className="text-xs text-gray-400 text-center">
                {isDragging ? 'Drop image here' : 'Drag and drop an image here, or click to select'}
              </p>
            )}
          </div>
          
          {/* URL Input */}
          <div className="mt-2">
            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="Or paste image URL"
              aria-label="Avatar image URL"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Upload an image or paste a URL (HTTP/HTTPS or homeserver path)
          </p>
        </div>

        {/* Status with Emoji Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Status <span className="text-xs text-gray-500">({status.length}/{VALIDATION_LIMITS.PROFILE_STATUS_MAX_LENGTH})</span>
          </label>
          <div className="flex gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-12 h-10 bg-gray-700 border border-gray-600 rounded-lg text-2xl hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer flex items-center justify-center"
                title="Pick emoji"
                aria-label="Open emoji picker"
                aria-expanded={showEmojiPicker}
                aria-haspopup="true"
              >
                {status && /^[\u{1F300}-\u{1F9FF}]/u.test(status) ? status.charAt(0) : '😊'}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl z-50 w-80 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-8 gap-2">
                    {COMMON_EMOJIS.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          // Prepend emoji to status text or replace existing emoji
                          const textWithoutEmoji = status.replace(/^[\u{1F300}-\u{1F9FF}\s]+/u, '').trim();
                          const newStatus = `${emoji} ${textWithoutEmoji}`.slice(0, VALIDATION_LIMITS.PROFILE_STATUS_MAX_LENGTH);
                          setStatus(newStatus);
                          setShowEmojiPicker(false);
                        }}
                        className="text-2xl hover:bg-gray-700 rounded p-1 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value.slice(0, VALIDATION_LIMITS.PROFILE_STATUS_MAX_LENGTH))}
              maxLength={VALIDATION_LIMITS.PROFILE_STATUS_MAX_LENGTH}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="👋 What's your status? (e.g., 🚀 Building cool stuff)"
              aria-label="Status"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Click the emoji button to pick one, or type emoji and text directly
          </p>
        </div>

        {/* Links */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Links
            </label>
            <button
              onClick={addLink}
              className="text-sm text-purple-400 hover:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
              aria-label="Add social link"
            >
              + Add Link
            </button>
          </div>

          <div className="space-y-2">
            {links.length >= VALIDATION_LIMITS.PROFILE_LINKS_MAX_COUNT && (
              <p className="text-xs text-yellow-500">Maximum {VALIDATION_LIMITS.PROFILE_LINKS_MAX_COUNT} links allowed</p>
            )}
            {links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={link.title}
                  onChange={(e) => updateLink(index, 'title', e.target.value.slice(0, VALIDATION_LIMITS.PROFILE_LINK_TITLE_MAX_LENGTH))}
                  maxLength={VALIDATION_LIMITS.PROFILE_LINK_TITLE_MAX_LENGTH}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Link title"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(index, 'url', e.target.value.slice(0, VALIDATION_LIMITS.PROFILE_LINK_URL_MAX_LENGTH))}
                  maxLength={VALIDATION_LIMITS.PROFILE_LINK_URL_MAX_LENGTH}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://..."
                />
                <button
                  onClick={() => removeLink(index)}
                  className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`Remove link ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Save profile"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

        <p className="text-xs text-gray-400">
          * Your profile will be saved as profile.json and a generated index.html on your homeserver
        </p>
      </div>
      
      {/* Image Cropper Modal */}
      {showCropper && imageFileToCrop && (
        <ImageCropper
          imageFile={imageFileToCrop}
          aspectRatio={1}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setImageFileToCrop(null);
          }}
        />
      )}
    </div>
  );
}
