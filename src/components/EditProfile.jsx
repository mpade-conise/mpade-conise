import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Camera,
  Check,
  Globe,
  Fingerprint,
  Cpu,
  Share2,
  Eye,
  Lock,
  MapPin,
  User,
  Film,
  HelpCircle,
  Calendar,
  Smartphone,
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  Music,
  Heart,
  ShieldCheck,
  Palette,
  LayoutGrid,
  Wallet,
  Sparkles,
  AtSign,
  FileText,
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const EditProfile = () => {
  const navigate = useNavigate();

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [showStatus, setShowStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    cover_url: '',
    profile_video_url: '',
    profile_music_url: '',
    status_message: '',
    district: 'Blantyre',
    interests: [],
    phone_number: '',
    gender: '',
    dob: '',
    location: '',
    theme_preference: 'neon',
    accent_color: '#06b6d4',
    layout_style: 'grid',
    payout_method: 'Mobile Money',
    currency_preference: 'MWK',
    is_private: false,
    verified_status: 'none'
  });

  const [website, setWebsite] = useState('');
  const [youtube, setYoutube] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setErrorMessage('No authenticated user was found.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          username: data.username || '',
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          cover_url: data.cover_url || '',
          profile_video_url: data.profile_video_url || '',
          profile_music_url: data.profile_music_url || '',
          status_message: data.status_message || '',
          district: data.district || 'Blantyre',
          interests: Array.isArray(data.interests) ? data.interests : [],
          phone_number: data.phone_number || '',
          gender: data.gender || '',
          dob: data.dob || '',
          location: data.location || '',
          theme_preference: data.theme_preference || 'neon',
          accent_color: data.accent_color || '#06b6d4',
          layout_style: data.layout_style || 'grid',
          payout_method: data.payout_method || 'Mobile Money',
          currency_preference: data.currency_preference || 'MWK',
          is_private: data.is_private ?? false,
          verified_status: data.verified_status || 'none'
        });

        const links = data.social_links || {};

        setWebsite(links.website || '');
        setYoutube(links.youtube || '');
        setWhatsapp(links.whatsapp || '');
        setInstagram(links.instagram || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setErrorMessage(err?.message || 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isAvatar = type === 'avatar';

    if (isAvatar) {
      setUploadingAvatar(true);
    } else {
      setUploadingCover(true);
    }

    setErrorMessage('');

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error('No authorized user identified.');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';

      const fileName = `${user.id}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${fileExt}`;

      const bucketName = isAvatar ? 'avatars' : 'covers';

      /*
       * Keep the existing storage structure used by the original code.
       */
      const filePath = `${bucketName}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl }
      } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Unable to generate the public image URL.');
      }

      setFormData(prev => ({
        ...prev,
        [isAvatar ? 'avatar_url' : 'cover_url']: publicUrl
      }));

      setShowStatus(true);

      setTimeout(() => {
        setShowStatus(false);
      }, 2200);
    } catch (error) {
      console.error('Upload error:', error);

      setErrorMessage(
        `Upload failed: ${error?.message || 'Unknown upload error'}`
      );
    } finally {
      if (isAvatar) {
        setUploadingAvatar(false);
      } else {
        setUploadingCover(false);
      }

      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleUpdate = async () => {
    if (saving || uploadingAvatar || uploadingCover) return;

    setSaving(true);
    setErrorMessage('');

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error('No authenticated user found.');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          cover_url: formData.cover_url,
          profile_video_url: formData.profile_video_url,
          profile_music_url: formData.profile_music_url,
          status_message: formData.status_message,
          district: formData.district,
          interests: formData.interests,
          phone_number: formData.phone_number,
          gender: formData.gender,
          dob: formData.dob === '' ? null : formData.dob,
          location: formData.location,
          theme_preference: formData.theme_preference,
          accent_color: formData.accent_color,
          layout_style: formData.layout_style,
          payout_method: formData.payout_method,
          currency_preference: formData.currency_preference,
          is_private: formData.is_private,
          verified_status: formData.verified_status,
          social_links: {
            website,
            youtube,
            whatsapp,
            instagram
          }
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setShowStatus(true);

      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (err) {
      console.error('Database Save Error:', err);

      setErrorMessage(
        err?.message || 'Unable to save your profile changes.'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = interest => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(item => item !== interest)
        : [...prev.interests, interest]
    }));
  };

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03040a] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="relative mx-auto mb-5 w-16 h-16">
            <div className="absolute inset-0 rounded-full border border-cyan-400/20" />

            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />

            <div className="absolute inset-3 rounded-full bg-cyan-400/5 flex items-center justify-center">
              <Cpu
                size={20}
                className="text-cyan-400 animate-pulse"
              />
            </div>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[4px] text-cyan-400">
            Loading Profile
          </p>

          <p className="text-[9px] text-zinc-600 mt-2">
            Synchronizing your account data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#03040a] text-zinc-100 font-sans overflow-x-hidden selection:bg-cyan-400 selection:text-black">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-180px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-500/8 blur-[130px] rounded-full" />

        <div className="absolute top-[600px] right-[-250px] w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full" />

        <div className="absolute bottom-[-250px] left-[-200px] w-[500px] h-[500px] bg-pink-500/5 blur-[120px] rounded-full" />
      </div>

      {/* CUSTOM SCROLLBAR */}
      <style>{`
        .edit-profile-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .edit-profile-scroll::-webkit-scrollbar-track {
          background: #03040a;
        }

        .edit-profile-scroll::-webkit-scrollbar-thumb {
          background: #171927;
          border-radius: 20px;
        }

        .edit-profile-scroll::-webkit-scrollbar-thumb:hover {
          background: #06b6d4;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: .7;
        }
      `}</style>

      {/* TOP NAVIGATION */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#05060c]/85 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">

          <button
            onClick={() => navigate(-1)}
            className="group w-10 h-10 rounded-xl border border-white/10 bg-white/[0.035] flex items-center justify-center hover:border-cyan-400/50 hover:bg-cyan-400/10 transition-all"
          >
            <ChevronLeft
              size={19}
              className="text-zinc-400 group-hover:text-cyan-400 transition-colors"
            />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Sparkles
                size={13}
                className="text-cyan-400"
              />

              <h1 className="text-[11px] sm:text-xs font-black uppercase tracking-[3px] sm:tracking-[5px] text-white">
                Edit Profile
              </h1>
            </div>

            <p className="text-[8px] text-zinc-600 uppercase tracking-[2px] mt-1">
              Personal Control Center
            </p>
          </div>

          <button
            onClick={handleUpdate}
            disabled={
              saving ||
              uploadingAvatar ||
              uploadingCover
            }
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-cyan-400 text-black text-[9px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,.18)] hover:bg-cyan-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2
                  size={13}
                  className="animate-spin"
                />
                Saving
              </>
            ) : (
              <>
                <Save size={13} />
                <span className="hidden sm:inline">
                  Save Changes
                </span>
                <span className="sm:hidden">
                  Save
                </span>
              </>
            )}
          </button>
        </div>
      </nav>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-32 edit-profile-scroll">

        {/* ERROR ALERT */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                y: -10
              }}
              className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-start gap-3"
            >
              <AlertCircle
                size={17}
                className="text-red-400 mt-0.5 shrink-0"
              />

              <p className="text-xs text-red-300 flex-1">
                {errorMessage}
              </p>

              <button
                onClick={() => setErrorMessage('')}
                className="text-zinc-500 hover:text-white"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PAGE INTRO */}
        <div className="mb-7">
          <p className="text-[9px] font-black uppercase tracking-[3px] text-cyan-400 mb-2">
            Account Settings
          </p>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Customize your identity.
          </h2>

          <p className="text-sm text-zinc-500 mt-2 max-w-2xl">
            Manage how your profile appears across the Universe.
            Update your identity, media, social links, privacy and
            account preferences.
          </p>
        </div>

        {/* PROFILE HERO */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#080a12] mb-8 shadow-[0_20px_80px_rgba(0,0,0,.35)]">

          {/* COVER */}
          <div className="relative h-48 sm:h-64 md:h-72 overflow-hidden">

            {formData.cover_url ? (
              <img
                src={formData.cover_url}
                alt="Profile cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-[#080a12] flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon
                    size={36}
                    strokeWidth={1}
                    className="mx-auto text-cyan-400/30"
                  />
                  <p className="text-[9px] uppercase tracking-[3px] text-zinc-600 mt-3">
                    No Cover Image
                  </p>
                </div>
              </div>
            )}

            {/* COVER GRADIENT */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-black/10 to-black/20" />

            {/* COVER BUTTON */}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute top-4 right-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/50 backdrop-blur-xl text-white text-[9px] font-black uppercase tracking-wider hover:bg-black/70 hover:border-cyan-400/50 transition-all disabled:opacity-50"
            >
              {uploadingCover ? (
                <Loader2
                  size={14}
                  className="animate-spin text-cyan-400"
                />
              ) : (
                <UploadCloud
                  size={14}
                  className="text-cyan-400"
                />
              )}

              <span className="hidden sm:inline">
                Change Cover
              </span>
            </button>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={e =>
                handleFileUpload(e, 'cover')
              }
              className="hidden"
            />
          </div>

          {/* PROFILE IDENTITY */}
          <div className="relative px-5 sm:px-7 pb-6">

            <div className="flex flex-col sm:flex-row sm:items-end gap-5">

              {/* AVATAR */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0">

                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[28px] p-1.5 bg-[#080a12] border border-cyan-400/60 shadow-[0_0_35px_rgba(6,182,212,.2)]">

                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt="Profile avatar"
                      className="w-full h-full object-cover rounded-[22px]"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[22px] bg-white/[0.035] flex items-center justify-center">
                      <User
                        size={42}
                        strokeWidth={1}
                        className="text-cyan-400/50"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    avatarInputRef.current?.click()
                  }
                  disabled={uploadingAvatar}
                  className="absolute bottom-2 right-2 w-9 h-9 rounded-xl bg-cyan-400 text-black flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,.45)] hover:bg-cyan-300 transition-all disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <Camera size={15} />
                  )}
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e =>
                    handleFileUpload(e, 'avatar')
                  }
                  className="hidden"
                />
              </div>

              {/* NAME */}
              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">

                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {formData.full_name ||
                      'Your Name'}
                  </h3>

                  {formData.verified_status !==
                    'none' && (
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        formData.verified_status ===
                        'gold'
                          ? 'bg-amber-400/15 text-amber-400'
                          : 'bg-cyan-400/15 text-cyan-400'
                      }`}
                    >
                      <ShieldCheck size={13} />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <AtSign
                    size={12}
                    className="text-cyan-400"
                  />

                  <p className="text-xs font-bold text-cyan-400">
                    {formData.username ||
                      'username'}
                  </p>
                </div>

                {formData.status_message && (
                  <p className="text-xs text-zinc-500 mt-3 max-w-xl">
                    {formData.status_message}
                  </p>
                )}
              </div>

              {/* PROFILE STATUS */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.025] border border-white/[0.07]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    formData.is_private
                      ? 'bg-pink-400'
                      : 'bg-emerald-400'
                  }`}
                />

                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                  {formData.is_private
                    ? 'Private'
                    : 'Public'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-7 space-y-6">

            {/* IDENTITY */}
            <SectionCard
              icon={<User size={16} />}
              title="Identity"
              description="Your basic public profile information."
              accent="cyan"
            >
              <div className="space-y-5">

                <InputField
                  label="Full Name"
                  value={formData.full_name}
                  onChange={v =>
                    updateField('full_name', v)
                  }
                  placeholder="Your full name"
                  icon={<User size={14} />}
                />

                <InputField
                  label="Username"
                  value={formData.username}
                  onChange={v =>
                    updateField('username', v)
                  }
                  placeholder="yourusername"
                  icon={<AtSign size={14} />}
                />

                <TextAreaField
                  label="Bio"
                  value={formData.bio}
                  onChange={v =>
                    updateField('bio', v)
                  }
                  placeholder="Tell people something about yourself..."
                />

                <InputField
                  label="Status Message"
                  value={formData.status_message}
                  onChange={v =>
                    updateField(
                      'status_message',
                      v
                    )
                  }
                  placeholder="What's happening right now?"
                  icon={<HelpCircle size={14} />}
                />
              </div>
            </SectionCard>

            {/* MEDIA */}
            <SectionCard
              icon={<Film size={16} />}
              title="Profile Media"
              description="Add video and music to your profile."
              accent="purple"
            >
              <div className="space-y-5">

                <InputField
                  label="Profile Background Video URL"
                  value={formData.profile_video_url}
                  onChange={v =>
                    updateField(
                      'profile_video_url',
                      v
                    )
                  }
                  placeholder="https://domain.com/video.mp4"
                  icon={<Film size={14} />}
                />

                <InputField
                  label="Profile Music URL"
                  value={formData.profile_music_url}
                  onChange={v =>
                    updateField(
                      'profile_music_url',
                      v
                    )
                  }
                  placeholder="https://domain.com/music.mp3"
                  icon={<Music size={14} />}
                />
              </div>
            </SectionCard>

            {/* SOCIAL LINKS */}
            <SectionCard
              icon={<Share2 size={16} />}
              title="Social Connections"
              description="Connect your other platforms to your profile."
              accent="pink"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                <InputField
                  label="Website"
                  value={website}
                  onChange={setWebsite}
                  placeholder="https://yourwebsite.com"
                  icon={<Globe size={14} />}
                />

                <InputField
                  label="YouTube"
                  value={youtube}
                  onChange={setYoutube}
                  placeholder="https://youtube.com/..."
                  icon={<Share2 size={14} />}
                />

                <InputField
                  label="WhatsApp"
                  value={whatsapp}
                  onChange={setWhatsapp}
                  placeholder="+265XXXXXXXXX"
                  icon={<Smartphone size={14} />}
                />

                <InputField
                  label="Instagram"
                  value={instagram}
                  onChange={setInstagram}
                  placeholder="https://instagram.com/..."
                  icon={<Heart size={14} />}
                />
              </div>
            </SectionCard>

            {/* INTERESTS */}
            <SectionCard
              icon={<Sparkles size={16} />}
              title="Interests"
              description="Choose the topics that represent you."
              accent="cyan"
            >
              <div className="flex flex-wrap gap-2.5">

                {[
                  'Music',
                  'Comedy',
                  'Lake Vibes',
                  'Tech',
                  'Art',
                  'Sports',
                  'Fashion',
                  'Football'
                ].map(tag => {
                  const active =
                    formData.interests.includes(
                      tag
                    );

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        toggleInterest(tag)
                      }
                      className={`px-4 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                        active
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,.16)]'
                          : 'border-white/[0.07] bg-white/[0.025] text-zinc-500 hover:text-white hover:border-cyan-400/30'
                      }`}
                    >
                      {active && (
                        <Check
                          size={11}
                          className="inline mr-1.5"
                        />
                      )}

                      {tag}
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-5 space-y-6">

            {/* LOCATION */}
            <SectionCard
              icon={<MapPin size={16} />}
              title="Location"
              description="Manage your location information."
              accent="cyan"
            >
              <div className="space-y-5">

                <SelectField
                  label="District"
                  value={formData.district}
                  onChange={v =>
                    updateField('district', v)
                  }
                  icon={<MapPin size={14} />}
                  options={[
                    'Blantyre',
                    'Lilongwe',
                    'Mzuzu',
                    'Nkhotakota',
                    'Zomba'
                  ]}
                />

                <InputField
                  label="Specific Location"
                  value={formData.location}
                  onChange={v =>
                    updateField('location', v)
                  }
                  placeholder="Area 49, Lilongwe"
                  icon={<MapPin size={14} />}
                />
              </div>
            </SectionCard>

            {/* PERSONAL */}
            <SectionCard
              icon={<Fingerprint size={16} />}
              title="Personal Details"
              description="Optional demographic information."
              accent="pink"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                <SelectField
                  label="Gender"
                  value={formData.gender}
                  onChange={v =>
                    updateField('gender', v)
                  }
                  icon={<Fingerprint size={14} />}
                  options={[
                    '',
                    'Male',
                    'Female'
                  ]}
                  labels={[
                    'Unspecified',
                    'Male',
                    'Female'
                  ]}
                />

                <DateField
                  label="Date of Birth"
                  value={formData.dob}
                  onChange={v =>
                    updateField('dob', v)
                  }
                />
              </div>
            </SectionCard>

            {/* APPEARANCE */}
            <SectionCard
              icon={<Palette size={16} />}
              title="Appearance"
              description="Customize the way your profile interface looks."
              accent="purple"
            >
              <div className="space-y-5">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-3">
                      Accent Color
                    </label>

                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={
                          formData.accent_color
                        }
                        onChange={e =>
                          updateField(
                            'accent_color',
                            e.target.value
                          )
                        }
                        className="w-10 h-10 rounded-xl border-0 bg-transparent cursor-pointer"
                      />

                      <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">
                        {formData.accent_color}
                      </span>
                    </div>
                  </div>

                  <SelectField
                    label="Theme"
                    value={
                      formData.theme_preference
                    }
                    onChange={v =>
                      updateField(
                        'theme_preference',
                        v
                      )
                    }
                    icon={<Palette size={14} />}
                    options={[
                      'neon',
                      'minimal'
                    ]}
                    labels={[
                      'Neon Matrix',
                      'Minimal'
                    ]}
                  />
                </div>

                <SelectField
                  label="Profile Layout"
                  value={formData.layout_style}
                  onChange={v =>
                    updateField(
                      'layout_style',
                      v
                    )
                  }
                  icon={<LayoutGrid size={14} />}
                  options={[
                    'grid',
                    'feed'
                  ]}
                  labels={[
                    'Grid Showcase',
                    'Vertical Feed'
                  ]}
                />
              </div>
            </SectionCard>

            {/* PRIVACY */}
            <SectionCard
              icon={<ShieldCheck size={16} />}
              title="Privacy & Security"
              description="Control profile visibility and verification settings."
              accent="cyan"
            >
              <div className="space-y-4">

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between gap-4">

                    <div className="flex items-start gap-3">

                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          formData.is_private
                            ? 'bg-pink-400/10 text-pink-400'
                            : 'bg-emerald-400/10 text-emerald-400'
                        }`}
                      >
                        {formData.is_private ? (
                          <Lock size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-black text-white">
                          Private Profile
                        </p>

                        <p className="text-[9px] text-zinc-600 mt-1 leading-relaxed">
                          Restrict access to your profile
                          content.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          'is_private',
                          !formData.is_private
                        )
                      }
                      className={`relative w-11 h-6 rounded-full transition-all ${
                        formData.is_private
                          ? 'bg-pink-400'
                          : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                          formData.is_private
                            ? 'left-6'
                            : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <SelectField
                  label="Verification Status"
                  value={
                    formData.verified_status
                  }
                  onChange={v =>
                    updateField(
                      'verified_status',
                      v
                    )
                  }
                  icon={<ShieldCheck size={14} />}
                  options={[
                    'none',
                    'blue',
                    'gold'
                  ]}
                  labels={[
                    'Standard',
                    'Blue Verified',
                    'Gold Verified'
                  ]}
                />
              </div>
            </SectionCard>

            {/* PAYOUT */}
            <SectionCard
              icon={<Wallet size={16} />}
              title="Payment Preferences"
              description="Configure the payment information associated with your profile."
              accent="emerald"
            >
              <div className="space-y-5">

                <InputField
                  label="Payment Phone Number"
                  value={formData.phone_number}
                  onChange={v =>
                    updateField(
                      'phone_number',
                      v
                    )
                  }
                  placeholder="+265XXXXXXXXX"
                  icon={<Smartphone size={14} />}
                />

                <div className="grid grid-cols-2 gap-4">

                  <SelectField
                    label="Payout Method"
                    value={
                      formData.payout_method
                    }
                    onChange={v =>
                      updateField(
                        'payout_method',
                        v
                      )
                    }
                    options={[
                      'Mobile Money',
                      'Bank Transfer'
                    ]}
                  />

                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.025] p-4">
                    <label className="block text-[8px] font-black uppercase tracking-wider text-zinc-500 mb-3">
                      Currency
                    </label>

                    <div className="text-sm font-black text-emerald-400">
                      {formData.currency_preference}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </main>

      {/* SUCCESS TOAST */}
      <AnimatePresence>
        {showStatus && (
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
              scale: 0.95
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.95
            }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] sm:w-auto"
          >
            <div className="px-5 py-3.5 rounded-2xl border border-emerald-400/30 bg-[#07110d]/95 backdrop-blur-xl shadow-[0_0_35px_rgba(16,185,129,.18)] flex items-center justify-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-400/10 flex items-center justify-center">
                <Check
                  size={15}
                  className="text-emerald-400"
                  strokeWidth={3}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  Changes Saved
                </p>

                <p className="text-[8px] text-zinc-500 mt-0.5">
                  Your profile has been synchronized.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* =========================================================
   SECTION CARD
========================================================= */

const SectionCard = ({
  icon,
  title,
  description,
  accent = 'cyan',
  children
}) => {
  const accentClasses = {
    cyan: {
      icon: 'bg-cyan-400/10 border-cyan-400/15 text-cyan-400',
      line: 'bg-cyan-400'
    },
    purple: {
      icon: 'bg-purple-400/10 border-purple-400/15 text-purple-400',
      line: 'bg-purple-400'
    },
    pink: {
      icon: 'bg-pink-400/10 border-pink-400/15 text-pink-400',
      line: 'bg-pink-400'
    },
    emerald: {
      icon: 'bg-emerald-400/10 border-emerald-400/15 text-emerald-400',
      line: 'bg-emerald-400'
    }
  };

  const style =
    accentClasses[accent] ||
    accentClasses.cyan;

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#080a12] p-5 sm:p-6 shadow-[0_15px_50px_rgba(0,0,0,.18)]">

      <div
        className={`absolute top-0 left-8 right-8 h-px ${style.line} opacity-40`}
      />

      <div className="flex items-start gap-3 mb-6">

        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${style.icon}`}
        >
          {icon}
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[2px] text-white">
            {title}
          </h3>

          <p className="text-[9px] text-zinc-600 mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
};

/* =========================================================
   INPUT FIELD
========================================================= */

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  icon
}) => {
  return (
    <div>
      <label className="block text-[9px] font-black uppercase tracking-[1.5px] text-zinc-500 mb-2">
        {label}
      </label>

      <div className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 transition-all focus-within:border-cyan-400/40 focus-within:bg-cyan-400/[0.025]">

        {icon && (
          <div className="shrink-0 text-zinc-600 group-focus-within:text-cyan-400 transition-colors">
            {icon}
          </div>
        )}

        <input
          type="text"
          value={value || ''}
          onChange={e =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          className="w-full bg-transparent outline-none border-none text-xs font-bold text-white placeholder:text-zinc-700"
        />
      </div>
    </div>
  );
};

/* =========================================================
   TEXT AREA
========================================================= */

const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder
}) => {
  return (
    <div>
      <label className="block text-[9px] font-black uppercase tracking-[1.5px] text-zinc-500 mb-2">
        {label}
      </label>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 transition-all focus-within:border-cyan-400/40 focus-within:bg-cyan-400/[0.025]">
        <textarea
          rows={4}
          value={value || ''}
          onChange={e =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          className="w-full resize-none bg-transparent outline-none border-none text-xs font-bold leading-relaxed text-white placeholder:text-zinc-700"
        />
      </div>
    </div>
  );
};

/* =========================================================
   SELECT FIELD
========================================================= */

const SelectField = ({
  label,
  value,
  onChange,
  options,
  labels,
  icon
}) => {
  return (
    <div>
      {label && (
        <label className="block text-[9px] font-black uppercase tracking-[1.5px] text-zinc-500 mb-2">
          {label}
        </label>
      )}

      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 focus-within:border-cyan-400/40">

        {icon && (
          <div className="shrink-0 text-zinc-600">
            {icon}
          </div>
        )}

        <select
          value={value}
          onChange={e =>
            onChange(e.target.value)
          }
          className="w-full bg-transparent outline-none border-none text-xs font-bold text-white cursor-pointer appearance-none"
        >
          {options.map((option, index) => (
            <option
              key={`${option}-${index}`}
              value={option}
              className="bg-[#080a12] text-white"
            >
              {labels?.[index] ||
                (option === ''
                  ? 'Unspecified'
                  : option)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/* =========================================================
   DATE FIELD
========================================================= */

const DateField = ({
  label,
  value,
  onChange
}) => {
  return (
    <div>
      <label className="block text-[9px] font-black uppercase tracking-[1.5px] text-zinc-500 mb-2">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 focus-within:border-emerald-400/40">

        <Calendar
          size={14}
          className="text-emerald-400 shrink-0"
        />

        <input
          type="date"
          value={value || ''}
          onChange={e =>
            onChange(e.target.value)
          }
          className="w-full bg-transparent outline-none border-none text-xs font-bold text-white cursor-pointer"
        />
      </div>
    </div>
  );
};

export default EditProfile;
