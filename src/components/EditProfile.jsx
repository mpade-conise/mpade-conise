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
  Save,
  ShieldCheck,
  Palette,
  Wallet,
  Sparkles,
  AlertCircle,
  X,
  CheckCircle2,
  UserRound,
  Link2,
  Settings2
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

  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: ''
  });

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

  const showNotification = (message, type = 'success') => {
    setNotification({
      show: true,
      type,
      message
    });

    setTimeout(() => {
      setNotification(prev => ({
        ...prev,
        show: false
      }));
    }, 3500);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        showNotification('No authenticated account was found.', 'error');
        setLoading(false);
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
      showNotification(
        err?.message || 'Unable to load your profile.',
        'error'
      );
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

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No authenticated user found.');
      }

      const fileExt = file.name.split('.').pop();

      const fileName = `${user.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const bucketName = isAvatar ? 'avatars' : 'covers';

      const filePath = `${bucketName}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl }
      } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      updateField(
        isAvatar ? 'avatar_url' : 'cover_url',
        publicUrl
      );

      showNotification(
        isAvatar
          ? 'Profile picture uploaded successfully.'
          : 'Cover image uploaded successfully.'
      );
    } catch (error) {
      console.error('Upload error:', error);

      showNotification(
        error?.message || 'Upload failed. Please try again.',
        'error'
      );
    } finally {
      if (isAvatar) {
        setUploadingAvatar(false);

        if (avatarInputRef.current) {
          avatarInputRef.current.value = '';
        }
      } else {
        setUploadingCover(false);

        if (coverInputRef.current) {
          coverInputRef.current.value = '';
        }
      }
    }
  };

  const handleUpdate = async () => {
    if (saving || uploadingAvatar || uploadingCover) return;

    setSaving(true);

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

      showNotification('Profile changes saved successfully.');

      setTimeout(() => {
        navigate(-1);
      }, 1400);
    } catch (err) {
      console.error('Database Save Error:', err);

      showNotification(
        err?.message || 'Unable to save profile changes.',
        'error'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030308] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl border border-cyan-400/30 bg-cyan-400/5 flex items-center justify-center">
              <Loader2
                size={25}
                className="text-cyan-400 animate-spin"
              />
            </div>

            <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-xl" />
          </div>

          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-[4px] text-white">
              Loading Profile
            </p>

            <p className="text-[9px] text-zinc-500 uppercase tracking-[2px] mt-2">
              Synchronizing your account
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#030308] text-zinc-100 font-sans overflow-y-auto selection:bg-cyan-400 selection:text-black edit-profile-scrollbar">

      <style>{`
        .edit-profile-scrollbar::-webkit-scrollbar {
          width: 7px;
        }

        .edit-profile-scrollbar::-webkit-scrollbar-track {
          background: #030308;
        }

        .edit-profile-scrollbar::-webkit-scrollbar-thumb {
          background: #17172a;
          border-radius: 20px;
          border: 1px solid rgba(6, 182, 212, 0.2);
        }

        .edit-profile-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #06b6d4;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: .65;
        }

        select option {
          background: #080812;
          color: white;
        }
      `}</style>

      {/* BACKGROUND ATMOSPHERE */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cyan-500/10 blur-[140px] rounded-full" />

        <div className="absolute top-[45%] -left-40 w-[350px] h-[350px] bg-purple-600/5 blur-[120px] rounded-full" />

        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-pink-500/5 blur-[120px] rounded-full" />
      </div>

      {/* TOP BAR */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#05050b]/85 backdrop-blur-2xl">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">

          <button
            onClick={() => navigate(-1)}
            className="group w-10 h-10 rounded-xl bg-white/[0.035] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all"
            aria-label="Go back"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Settings2 size={14} className="text-cyan-400" />

              <h1 className="text-[11px] sm:text-xs font-black uppercase tracking-[3px] sm:tracking-[5px] text-white">
                Edit Profile
              </h1>
            </div>

            <p className="text-[8px] text-zinc-500 uppercase tracking-[2px] mt-1">
              Personal Control Center
            </p>
          </div>

          <button
            onClick={handleUpdate}
            disabled={saving || uploadingAvatar || uploadingCover}
            className="group flex items-center gap-2 px-4 sm:px-5 h-10 rounded-xl bg-cyan-400 text-black text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.18)] transition-all"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span className="hidden sm:inline">
                  Saving
                </span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span className="hidden sm:inline">
                  Save
                </span>
              </>
            )}
          </button>

        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-32">

        {/* PROFILE PREVIEW */}

        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#080811] shadow-[0_20px_80px_rgba(0,0,0,.35)] mb-8"
        >

          {/* COVER */}

          <div className="relative h-48 sm:h-64 md:h-72 overflow-hidden">

            {formData.cover_url ? (
              <img
                src={formData.cover_url}
                alt="Profile cover"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#0b1720] via-[#090915] to-[#05050a]">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,rgba(6,182,212,.35),transparent_35%),radial-gradient(circle_at_75%_20%,rgba(168,85,247,.25),transparent_35%)]" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon
                    size={40}
                    strokeWidth={1}
                    className="text-cyan-400/20"
                  />
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#080811] via-black/10 to-black/10" />

            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 backdrop-blur-xl text-white text-[9px] font-black uppercase tracking-wider hover:border-cyan-400/50 hover:bg-black/80 transition-all disabled:opacity-50"
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

                {uploadingCover
                  ? 'Uploading'
                  : 'Change Cover'}
              </button>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={e => handleFileUpload(e, 'cover')}
              className="hidden"
            />
          </div>

          {/* PROFILE IDENTITY */}

          <div className="relative px-5 sm:px-8 pb-7">

            <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16">

              {/* AVATAR */}

              <div className="relative shrink-0">

                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] p-1.5 bg-[#080811] border border-cyan-400/60 shadow-[0_0_35px_rgba(6,182,212,.22)]">

                  <div className="relative w-full h-full rounded-[21px] overflow-hidden bg-[#101020]">

                    {formData.avatar_url ? (
                      <img
                        src={formData.avatar_url}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserRound
                          size={40}
                          strokeWidth={1}
                          className="text-cyan-400/50"
                        />
                      </div>
                    )}

                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2
                          size={24}
                          className="text-cyan-400 animate-spin"
                        />
                      </div>
                    )}

                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -right-2 -bottom-2 w-10 h-10 rounded-xl bg-cyan-400 text-black border-4 border-[#080811] flex items-center justify-center hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(6,182,212,.3)] disabled:opacity-50"
                  aria-label="Change profile picture"
                >
                  {uploadingAvatar ? (
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <Camera size={16} />
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

              <div className="pb-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                    {formData.full_name ||
                      'Your Profile'}
                  </h2>

                  {formData.verified_status !== 'none' && (
                    <span
                      className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        formData.verified_status === 'gold'
                          ? 'bg-amber-400 text-black'
                          : 'bg-cyan-400 text-black'
                      }`}
                    >
                      <Check size={12} strokeWidth={4} />
                    </span>
                  )}
                </div>

                <p className="text-sm text-cyan-400 font-bold mt-1">
                  @{formData.username || 'username'}
                </p>

                {formData.status_message && (
                  <p className="text-xs text-zinc-500 mt-2">
                    {formData.status_message}
                  </p>
                )}
              </div>

            </div>

          </div>
        </motion.section>

        {/* MAIN GRID */}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* LEFT */}

          <div className="xl:col-span-7 space-y-6">

            {/* IDENTITY */}

            <SettingsCard
              icon={<User size={16} />}
              title="Personal Information"
              subtitle="Your public profile identity"
              iconClass="text-cyan-400"
            >

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <InputField
                  label="Full Name"
                  value={formData.full_name}
                  onChange={v =>
                    updateField('full_name', v)
                  }
                  placeholder="Your full name"
                />

                <InputField
                  label="Username"
                  value={formData.username}
                  onChange={v =>
                    updateField('username', v)
                  }
                  placeholder="username"
                  prefix="@"
                />

              </div>

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
                  updateField('status_message', v)
                }
                placeholder="What's happening right now?"
                icon={<HelpCircle size={15} />}
              />

            </SettingsCard>

            {/* MEDIA */}

            <SettingsCard
              icon={<Cpu size={16} />}
              title="Profile Media"
              subtitle="Optional video and music displayed on your profile"
              iconClass="text-purple-400"
              variant="purple"
            >

              <InputField
                label="Profile Video URL"
                value={formData.profile_video_url}
                onChange={v =>
                  updateField('profile_video_url', v)
                }
                placeholder="https://example.com/video.mp4"
                icon={<Film size={15} />}
                accent="purple"
              />

              <InputField
                label="Profile Music URL"
                value={formData.profile_music_url}
                onChange={v =>
                  updateField('profile_music_url', v)
                }
                placeholder="https://example.com/music.mp3"
                icon={<Music size={15} />}
                accent="purple"
              />

            </SettingsCard>

            {/* SOCIAL */}

            <SettingsCard
              icon={<Share2 size={16} />}
              title="Social Links"
              subtitle="Connect your external social platforms"
              iconClass="text-pink-400"
              variant="pink"
            >

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <InputField
                  label="Website"
                  value={website}
                  onChange={setWebsite}
                  placeholder="https://yourwebsite.com"
                  icon={<Globe size={15} />}
                  accent="cyan"
                />

                <InputField
                  label="YouTube"
                  value={youtube}
                  onChange={setYoutube}
                  placeholder="https://youtube.com/..."
                  icon={<Share2 size={15} />}
                  accent="pink"
                />

                <InputField
                  label="WhatsApp"
                  value={whatsapp}
                  onChange={setWhatsapp}
                  placeholder="+265XXXXXXXXX"
                  icon={<Smartphone size={15} />}
                  accent="green"
                />

                <InputField
                  label="Instagram"
                  value={instagram}
                  onChange={setInstagram}
                  placeholder="https://instagram.com/..."
                  icon={<Heart size={15} />}
                  accent="pink"
                />

              </div>

            </SettingsCard>

          </div>

          {/* RIGHT */}

          <div className="xl:col-span-5 space-y-6">

            {/* LOCATION */}

            <SettingsCard
              icon={<MapPin size={16} />}
              title="Location"
              subtitle="Regional profile information"
              iconClass="text-cyan-400"
            >

              <SelectField
                label="Home District"
                value={formData.district}
                onChange={v =>
                  updateField('district', v)
                }
                icon={<MapPin size={15} />}
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
                placeholder="Example: Area 49, Lilongwe"
                icon={<MapPin size={15} />}
              />

            </SettingsCard>

            {/* DEMOGRAPHICS */}

            <SettingsCard
              icon={<Fingerprint size={16} />}
              title="Basic Details"
              subtitle="Optional personal information"
              iconClass="text-pink-400"
              variant="pink"
            >

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <SelectField
                  label="Gender"
                  value={formData.gender}
                  onChange={v =>
                    updateField('gender', v)
                  }
                  icon={<Fingerprint size={15} />}
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
                  accent="pink"
                />

                <DateField
                  label="Date of Birth"
                  value={formData.dob}
                  onChange={v =>
                    updateField('dob', v)
                  }
                />

              </div>

            </SettingsCard>

            {/* INTERESTS */}

            <SettingsCard
              icon={<Sparkles size={16} />}
              title="Interests"
              subtitle="Choose topics that represent you"
              iconClass="text-cyan-400"
            >

              <div className="flex flex-wrap gap-2">

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
                    formData.interests.includes(tag);

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        toggleInterest(tag)
                      }
                      className={`px-3.5 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                        active
                          ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_18px_rgba(6,182,212,.25)]'
                          : 'bg-white/[0.025] border-white/[0.07] text-zinc-500 hover:text-white hover:border-cyan-400/30'
                      }`}
                    >
                      {active && (
                        <Check
                          size={11}
                          className="inline mr-1"
                        />
                      )}

                      {tag}
                    </button>
                  );
                })}

              </div>

              <p className="text-[9px] text-zinc-600 mt-3">
                {formData.interests.length} interest
                {formData.interests.length === 1
                  ? ''
                  : 's'} selected
              </p>

            </SettingsCard>

            {/* APPEARANCE */}

            <SettingsCard
              icon={<Palette size={16} />}
              title="Appearance"
              subtitle="Customize your profile environment"
              iconClass="text-purple-400"
              variant="purple"
            >

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-4">

                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-3">
                    Accent Color
                  </label>

                  <div className="flex items-center gap-3">

                    <input
                      type="color"
                      value={formData.accent_color}
                      onChange={e =>
                        updateField(
                          'accent_color',
                          e.target.value
                        )
                      }
                      className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                    />

                    <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">
                      {formData.accent_color}
                    </span>

                  </div>

                </div>

                <SelectField
                  label="Theme"
                  value={formData.theme_preference}
                  onChange={v =>
                    updateField(
                      'theme_preference',
                      v
                    )
                  }
                  options={[
                    'neon',
                    'minimal'
                  ]}
                  labels={[
                    'Neon Matrix',
                    'Minimal'
                  ]}
                  accent="purple"
                />

              </div>

              <SelectField
                label="Profile Layout"
                value={formData.layout_style}
                onChange={v =>
                  updateField('layout_style', v)
                }
                options={[
                  'grid',
                  'feed'
                ]}
                labels={[
                  'Grid Showcase',
                  'Vertical Feed'
                ]}
                accent="purple"
              />

            </SettingsCard>

            {/* PRIVACY */}

            <SettingsCard
              icon={<ShieldCheck size={16} />}
              title="Privacy & Security"
              subtitle="Control how your profile behaves"
              iconClass="text-cyan-400"
            >

              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-4">

                <div className="flex items-center justify-between gap-4">

                  <div className="flex items-center gap-3">

                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        formData.is_private
                          ? 'bg-pink-500/10 text-pink-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {formData.is_private ? (
                        <Lock size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-white">
                        Private Profile
                      </p>

                      <p className="text-[9px] text-zinc-500 mt-1">
                        {formData.is_private
                          ? 'Your profile is restricted.'
                          : 'Your profile is publicly visible.'}
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
                    className={`relative w-12 h-7 rounded-full transition-all ${
                      formData.is_private
                        ? 'bg-cyan-400'
                        : 'bg-white/10'
                    }`}
                    aria-label="Toggle private profile"
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                        formData.is_private
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>

                </div>

              </div>

              <SelectField
                label="Verification Status"
                value={formData.verified_status}
                onChange={v =>
                  updateField(
                    'verified_status',
                    v
                  )
                }
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
                accent="cyan"
              />

            </SettingsCard>

            {/* PAYOUT */}

            <SettingsCard
              icon={<Wallet size={16} />}
              title="Payment Preferences"
              subtitle="Settings used for payment distribution"
              iconClass="text-emerald-400"
              variant="green"
            >

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
                icon={<Smartphone size={15} />}
                accent="green"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <SelectField
                  label="Payout Method"
                  value={formData.payout_method}
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
                  accent="green"
                />

                <div className="rounded-2xl bg-white/[0.025] border border-emerald-500/15 p-4">

                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-2">
                    Currency
                  </label>

                  <div className="flex items-center gap-2">
                    <Wallet
                      size={15}
                      className="text-emerald-400"
                    />

                    <span className="text-xs font-black text-emerald-400">
                      {formData.currency_preference}
                    </span>
                  </div>

                </div>

              </div>

            </SettingsCard>

          </div>

        </div>

        {/* MOBILE SAVE BUTTON */}

        <div className="mt-8 lg:hidden">

          <button
            onClick={handleUpdate}
            disabled={
              saving ||
              uploadingAvatar ||
              uploadingCover
            }
            className="w-full h-14 rounded-2xl bg-cyan-400 text-black font-black uppercase tracking-[3px] text-[10px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,.18)] disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Saving Changes
              </>
            ) : (
              <>
                <Save size={17} />
                Save Profile Changes
              </>
            )}
          </button>

        </div>

      </main>

      {/* NOTIFICATION */}

      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
              x: '-50%'
            }}
            animate={{
              opacity: 1,
              y: 0,
              x: '-50%'
            }}
            exit={{
              opacity: 0,
              y: 20,
              x: '-50%'
            }}
            className={`fixed bottom-6 left-1/2 z-[100] min-w-[280px] max-w-[calc(100vw-32px)] px-4 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 ${
              notification.type === 'error'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}
          >

            <div
              className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${
                notification.type === 'error'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {notification.type === 'error' ? (
                <AlertCircle size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
            </div>

            <p className="flex-1 text-[10px] font-bold text-white">
              {notification.message}
            </p>

            <button
              onClick={() =>
                setNotification(prev => ({
                  ...prev,
                  show: false
                }))
              }
              className="text-zinc-500 hover:text-white"
            >
              <X size={14} />
            </button>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

/* =========================================================
   SETTINGS CARD
========================================================= */

const SettingsCard = ({
  icon,
  title,
  subtitle,
  children,
  iconClass = 'text-cyan-400',
  variant = 'cyan'
}) => {

  const border =
    variant === 'purple'
      ? 'border-purple-500/10'
      : variant === 'pink'
      ? 'border-pink-500/10'
      : variant === 'green'
      ? 'border-emerald-500/10'
      : 'border-cyan-500/10';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[26px] border ${border} bg-[#080811]/90 backdrop-blur-xl p-5 sm:p-6 shadow-[0_15px_50px_rgba(0,0,0,.18)]`}
    >

      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.06]">

        <div
          className={`w-10 h-10 rounded-xl bg-white/[0.035] border border-white/[0.07] flex items-center justify-center ${iconClass}`}
        >
          {icon}
        </div>

        <div>
          <h3 className="text-[11px] font-black uppercase tracking-[2px] text-white">
            {title}
          </h3>

          <p className="text-[9px] text-zinc-600 mt-1">
            {subtitle}
          </p>
        </div>

      </div>

      <div className="space-y-4">
        {children}
      </div>

    </motion.section>
  );
};

/* =========================================================
   INPUT
========================================================= */

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  icon,
  prefix,
  accent = 'cyan'
}) => {

  const iconColor =
    accent === 'purple'
      ? 'text-purple-400'
      : accent === 'pink'
      ? 'text-pink-400'
      : accent === 'green'
      ? 'text-emerald-400'
      : 'text-cyan-400';

  return (
    <div>

      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-2">
        {label}
      </label>

      <div className="group flex items-center gap-3 min-h-[48px] px-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] focus-within:border-cyan-400/40 focus-within:bg-cyan-400/[0.02] transition-all">

        {prefix && (
          <span className="text-sm font-black text-zinc-600">
            {prefix}
          </span>
        )}

        {icon && (
          <span className={`${iconColor} shrink-0`}>
            {icon}
          </span>
        )}

        <input
          type="text"
          value={value || ''}
          onChange={e =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-zinc-700"
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
}) => (
  <div>

    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-2">
      {label}
    </label>

    <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] focus-within:border-cyan-400/40 focus-within:bg-cyan-400/[0.02] transition-all p-4">

      <textarea
        rows={4}
        value={value || ''}
        onChange={e =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none resize-none text-xs font-bold leading-relaxed text-white placeholder:text-zinc-700"
      />

    </div>

  </div>
);

/* =========================================================
   SELECT
========================================================= */

const SelectField = ({
  label,
  value,
  onChange,
  options,
  labels,
  icon,
  accent = 'cyan'
}) => {

  const color =
    accent === 'purple'
      ? 'text-purple-400'
      : accent === 'pink'
      ? 'text-pink-400'
      : accent === 'green'
      ? 'text-emerald-400'
      : 'text-cyan-400';

  return (
    <div>

      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-2">
        {label}
      </label>

      <div className="relative flex items-center gap-3 min-h-[48px] px-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] focus-within:border-cyan-400/40 transition-all">

        {icon && (
          <span className={`${color} shrink-0`}>
            {icon}
          </span>
        )}

        <select
          value={value ?? ''}
          onChange={e =>
            onChange(e.target.value)
          }
          className={`w-full bg-transparent border-none outline-none text-xs font-black ${color} appearance-none cursor-pointer pr-5`}
        >
          {options.map((option, index) => (
            <option
              key={`${option}-${index}`}
              value={option}
            >
              {labels?.[index] ?? option}
            </option>
          ))}
        </select>

        <span className="absolute right-4 pointer-events-none text-zinc-600 text-[9px]">
          ▼
        </span>

      </div>

    </div>
  );
};

/* =========================================================
   DATE
========================================================= */

const DateField = ({
  label,
  value,
  onChange
}) => (
  <div>

    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-2">
      {label}
    </label>

    <div className="flex items-center gap-3 min-h-[48px] px-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] focus-within:border-emerald-400/40 transition-all">

      <Calendar
        size={15}
        className="text-emerald-400 shrink-0"
      />

      <input
        type="date"
        value={value || ''}
        onChange={e =>
          onChange(e.target.value)
        }
        className="w-full bg-transparent border-none outline-none text-xs font-bold text-white cursor-pointer"
      />

    </div>

  </div>
);

export default EditProfile;
