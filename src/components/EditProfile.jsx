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
  Wallet,
  Palette,
  Music,
  Heart,
  MapPin,
  User,
  Film,
  HelpCircle,
  Calendar,
  Shield,
  Smartphone,
  Sparkles,
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  Save,
  Link as LinkIcon,
  LayoutGrid,
  Settings2,
  Map,
  CircleDollarSign,
  BadgeCheck,
  UserRound,
  X
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const INTEREST_OPTIONS = [
  'Music',
  'Comedy',
  'Lake Vibes',
  'Tech',
  'Art',
  'Sports',
  'Fashion',
  'Football'
];

const DISTRICTS = [
  'Blantyre',
  'Lilongwe',
  'Mzuzu',
  'Nkhotakota',
  'Zomba'
];

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
  const [currentUser, setCurrentUser] = useState(null);

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

  /* =========================================================
     PROFILE FETCH
  ========================================================= */

  const getProfile = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        navigate('/login');
        return;
      }

      setCurrentUser(user);

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
          interests: Array.isArray(data.interests)
            ? data.interests
            : [],
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
      setErrorMessage(
        err?.message || 'Unable to load your profile.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     GENERIC FORM UPDATE
  ========================================================= */

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /* =========================================================
     FILE UPLOAD
  ========================================================= */

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
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error('You must be logged in to upload an image.');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file.');
      }

      const fileExt =
        file.name.split('.').pop()?.toLowerCase() || 'jpg';

      const safeName = `${user.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${fileExt}`;

      const bucketName = isAvatar ? 'avatars' : 'covers';

      /*
       * IMPORTANT:
       * The bucket is already supplied to .from(bucketName),
       * therefore the path should NOT contain the bucket name again.
       */
      const filePath = safeName;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl }
      } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Unable to generate the uploaded image URL.');
      }

      updateField(
        isAvatar ? 'avatar_url' : 'cover_url',
        publicUrl
      );
    } catch (error) {
      console.error('Upload error:', error);

      setErrorMessage(
        error?.message || 'Image upload failed.'
      );
    } finally {
      if (isAvatar) {
        setUploadingAvatar(false);
      } else {
        setUploadingCover(false);
      }

      event.target.value = '';
    }
  };

  /* =========================================================
     SAVE PROFILE
  ========================================================= */

  const handleUpdate = async () => {
    if (saving || uploadingAvatar || uploadingCover) return;

    setSaving(true);
    setErrorMessage('');

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const profilePayload = {
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        bio: formData.bio.trim(),
        avatar_url: formData.avatar_url,
        cover_url: formData.cover_url,
        profile_video_url: formData.profile_video_url.trim(),
        profile_music_url: formData.profile_music_url.trim(),
        status_message: formData.status_message.trim(),
        district: formData.district,
        interests: formData.interests,
        phone_number: formData.phone_number.trim(),
        gender: formData.gender,
        dob: formData.dob === '' ? null : formData.dob,
        location: formData.location.trim(),
        theme_preference: formData.theme_preference,
        accent_color: formData.accent_color,
        layout_style: formData.layout_style,
        payout_method: formData.payout_method,
        currency_preference: formData.currency_preference,
        is_private: formData.is_private,
        verified_status: formData.verified_status,
        social_links: {
          website: website.trim(),
          youtube: youtube.trim(),
          whatsapp: whatsapp.trim(),
          instagram: instagram.trim()
        }
      };

      const { error } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', user.id);

      if (error) throw error;

      setShowStatus(true);

      setTimeout(() => {
        setShowStatus(false);
      }, 2500);
    } catch (err) {
      console.error('Database Save Error:', err);

      setErrorMessage(
        err?.message || 'Unable to save profile changes.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     INTERESTS
  ========================================================= */

  const toggleInterest = interest => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(item => item !== interest)
        : [...prev.interests, interest]
    }));
  };

  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03040a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-5">
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/20" />
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-cyan-400 animate-spin" />
            <div className="absolute inset-3 rounded-xl bg-cyan-400/10 flex items-center justify-center">
              <Cpu
                size={20}
                className="text-cyan-400 animate-pulse"
              />
            </div>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[4px] text-cyan-400">
            Loading Profile
          </p>

          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-2">
            Synchronizing account data
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <div className="min-h-screen w-full bg-[#03040a] text-zinc-100 font-sans overflow-y-auto selection:bg-cyan-400 selection:text-black">

      {/* =====================================================
          PAGE BACKGROUND
      ===================================================== */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-cyan-500/10 blur-[140px]" />

        <div className="absolute top-[35%] -left-40 w-[500px] h-[500px] bg-purple-600/5 blur-[120px]" />

        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-500/5 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* =====================================================
          CUSTOM SCROLLBAR
      ===================================================== */}

      <style>{`
        .profile-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .profile-scroll::-webkit-scrollbar-track {
          background: #03040a;
        }

        .profile-scroll::-webkit-scrollbar-thumb {
          background: #17202c;
          border-radius: 999px;
          border: 1px solid rgba(6,182,212,.25);
        }

        .profile-scroll::-webkit-scrollbar-thumb:hover {
          background: #06b6d4;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: .7;
          cursor: pointer;
        }

        select option {
          background: #090b14;
          color: white;
        }
      `}</style>

      <div className="relative z-10">

        {/* ===================================================
            TOP NAVIGATION
        =================================================== */}

        <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#05060c]/90 backdrop-blur-2xl">

          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">

            <button
              onClick={() => navigate(-1)}
              className="
                group
                w-10 h-10
                rounded-xl
                border border-white/10
                bg-white/[0.03]
                flex items-center justify-center
                text-zinc-400
                hover:text-cyan-400
                hover:border-cyan-400/40
                hover:bg-cyan-400/5
                transition-all
              "
              aria-label="Go back"
            >
              <ChevronLeft
                size={19}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
            </button>

            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles
                  size={14}
                  className="text-cyan-400"
                />

                <h1 className="text-[11px] sm:text-xs font-black uppercase tracking-[4px] text-white">
                  Edit Profile
                </h1>
              </div>

              <p className="hidden sm:block text-[8px] text-zinc-500 uppercase tracking-[3px] mt-1">
                Universe Identity Control
              </p>
            </div>

            <button
              onClick={handleUpdate}
              disabled={
                saving ||
                uploadingAvatar ||
                uploadingCover
              }
              className="
                flex items-center gap-2
                px-4 sm:px-5
                h-10
                rounded-xl
                bg-cyan-400
                text-black
                text-[9px]
                font-black
                uppercase
                tracking-widest
                shadow-[0_0_25px_rgba(34,211,238,.2)]
                hover:shadow-[0_0_30px_rgba(34,211,238,.4)]
                hover:bg-cyan-300
                transition-all
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >
              {saving ? (
                <>
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Saving
                </>
              ) : (
                <>
                  <Save size={14} />
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

        {/* ===================================================
            ERROR MESSAGE
        =================================================== */}

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 pt-5"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                <Shield
                  size={17}
                  className="text-red-400 mt-0.5 shrink-0"
                />

                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-400">
                    Profile Operation Error
                  </p>

                  <p className="text-xs text-zinc-400 mt-1 break-words">
                    {errorMessage}
                  </p>
                </div>

                <button
                  onClick={() => setErrorMessage('')}
                  className="text-zinc-500 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-32 profile-scroll">

          {/* =================================================
              PROFILE PREVIEW / MEDIA
          ================================================= */}

          <section className="relative rounded-[28px] overflow-hidden border border-white/[0.08] bg-[#080a12] shadow-2xl mb-8">

            {/* COVER */}
            <div className="relative h-[190px] sm:h-[260px] overflow-hidden">

              {formData.cover_url ? (
                <img
                  src={formData.cover_url}
                  alt="Profile cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-950/40 via-[#080a12] to-purple-950/40 flex items-center justify-center">
                  <ImageIcon
                    size={45}
                    strokeWidth={1}
                    className="text-cyan-400/30"
                  />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-black/10 to-black/20" />

              {/* COVER BUTTON */}
              <button
                type="button"
                onClick={() =>
                  coverInputRef.current?.click()
                }
                disabled={uploadingCover}
                className="
                  absolute
                  right-4
                  top-4
                  flex items-center gap-2
                  px-3.5 py-2.5
                  rounded-xl
                  border border-white/15
                  bg-black/60
                  backdrop-blur-xl
                  text-white
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wider
                  hover:border-cyan-400/50
                  hover:text-cyan-300
                  transition-all
                "
              >
                {uploadingCover ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <Camera size={14} />
                )}

                <span className="hidden sm:inline">
                  {uploadingCover
                    ? 'Uploading'
                    : 'Change Cover'}
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
            <div className="relative px-5 sm:px-8 pb-7">

              <div className="flex flex-col sm:flex-row sm:items-end gap-5">

                {/* AVATAR */}
                <div className="relative -mt-16 sm:-mt-20 shrink-0">

                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[28px] bg-[#080a12] p-1.5 border border-cyan-400/50 shadow-[0_0_35px_rgba(6,182,212,.2)]">

                    <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-[#101321]">

                      {formData.avatar_url ? (
                        <img
                          src={formData.avatar_url}
                          alt="Profile avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserRound
                            size={42}
                            className="text-cyan-400/50"
                            strokeWidth={1}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          avatarInputRef.current?.click()
                        }
                        disabled={uploadingAvatar}
                        className="
                          absolute inset-0
                          bg-black/70
                          backdrop-blur-sm
                          opacity-0 hover:opacity-100
                          transition-opacity
                          flex flex-col
                          items-center
                          justify-center
                          gap-2
                          text-cyan-300
                        "
                      >
                        {uploadingAvatar ? (
                          <Loader2
                            size={20}
                            className="animate-spin"
                          />
                        ) : (
                          <>
                            <Camera size={22} />
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              Change Photo
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

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

                {/* IDENTITY */}
                <div className="flex-1 min-w-0 pb-1">

                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                      {formData.full_name ||
                        'Your Name'}
                    </h2>

                    {formData.verified_status !==
                      'none' && (
                      <BadgeCheck
                        size={18}
                        className={
                          formData.verified_status ===
                          'gold'
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }
                      />
                    )}
                  </div>

                  <p className="text-sm font-bold text-cyan-400 mt-0.5 truncate">
                    @{formData.username ||
                      'username'}
                  </p>

                  {formData.status_message && (
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
                      {formData.status_message}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">

                    {formData.district && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[9px] font-bold text-zinc-400">
                        <MapPin
                          size={11}
                          className="text-cyan-400"
                        />
                        {formData.district}
                      </span>
                    )}

                    {formData.is_private && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-500/5 border border-pink-500/20 text-[9px] font-bold text-pink-400">
                        <Lock size={11} />
                        Private
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              ALL SETTINGS
          ================================================= */}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* =================================================
                LEFT COLUMN
            ================================================= */}

            <div className="xl:col-span-7 space-y-6">

              {/* ===============================================
                  IDENTITY
              =============================================== */}

              <SectionCard
                icon={<User size={17} />}
                title="Identity"
                subtitle="Your public profile information"
                accent="cyan"
              >

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

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
                    placeholder="username"
                    icon={<Fingerprint size={14} />}
                  />
                </div>

                <TextAreaField
                  label="Bio"
                  value={formData.bio}
                  onChange={v =>
                    updateField('bio', v)
                  }
                  placeholder="Tell the universe about yourself..."
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

              </SectionCard>

              {/* ===============================================
                  MEDIA
              =============================================== */}

              <SectionCard
                icon={<Film size={17} />}
                title="Profile Media"
                subtitle="Video and music displayed on your profile"
                accent="purple"
              >

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

                <div className="rounded-xl border border-purple-500/10 bg-purple-500/[0.03] p-3">
                  <div className="flex gap-3">
                    <Music
                      size={15}
                      className="text-purple-400 mt-0.5"
                    />

                    <p className="text-[10px] leading-relaxed text-zinc-500">
                      These URLs are stored directly in your
                      profile. Make sure the media is publicly
                      accessible if visitors need to play it.
                    </p>
                  </div>
                </div>

              </SectionCard>

              {/* ===============================================
                  SOCIAL LINKS
              =============================================== */}

              <SectionCard
                icon={<Share2 size={17} />}
                title="Social Links"
                subtitle="Connect your other platforms"
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

              {/* ===============================================
                  INTERESTS
              =============================================== */}

              <SectionCard
                icon={<Sparkles size={17} />}
                title="Interests"
                subtitle="Choose topics that represent you"
                accent="cyan"
              >

                <div className="flex flex-wrap gap-2.5">

                  {INTEREST_OPTIONS.map(tag => {
                    const active =
                      formData.interests.includes(tag);

                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          toggleInterest(tag)
                        }
                        className={`
                          px-4 py-2.5
                          rounded-xl
                          border
                          text-[9px]
                          font-black
                          uppercase
                          tracking-wider
                          transition-all
                          ${
                            active
                              ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,.12)]'
                              : 'border-white/[0.07] bg-white/[0.025] text-zinc-500 hover:text-white hover:border-cyan-400/30'
                          }
                        `}
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

            {/* =================================================
                RIGHT COLUMN
            ================================================= */}

            <div className="xl:col-span-5 space-y-6">

              {/* ===============================================
                  LOCATION
              =============================================== */}

              <SectionCard
                icon={<Map size={17} />}
                title="Location"
                subtitle="Regional profile information"
                accent="cyan"
              >

                <SelectField
                  label="Home District"
                  value={formData.district}
                  onChange={v =>
                    updateField('district', v)
                  }
                  icon={<MapPin size={14} />}
                  options={DISTRICTS}
                />

                <InputField
                  label="Specific Location"
                  value={formData.location}
                  onChange={v =>
                    updateField('location', v)
                  }
                  placeholder="Example: Area 49, Lilongwe"
                  icon={<MapPin size={14} />}
                />

              </SectionCard>

              {/* ===============================================
                  PERSONAL INFORMATION
              =============================================== */}

              <SectionCard
                icon={<Fingerprint size={17} />}
                title="Personal Information"
                subtitle="Additional identity information"
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
                      {
                        label: 'Unspecified',
                        value: ''
                      },
                      {
                        label: 'Male',
                        value: 'Male'
                      },
                      {
                        label: 'Female',
                        value: 'Female'
                      }
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

              {/* ===============================================
                  APPEARANCE
              =============================================== */}

              <SectionCard
                icon={<Palette size={17} />}
                title="Appearance"
                subtitle="Customize how your profile interface looks"
                accent="purple"
              >

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">

                    <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
                      Accent Color
                    </label>

                    <div className="flex items-center gap-3 mt-3">

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
                        className="w-9 h-9 rounded-lg bg-transparent cursor-pointer"
                      />

                      <span className="text-[10px] font-mono font-bold text-purple-300">
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
                      {
                        label: 'Neon Matrix',
                        value: 'neon'
                      },
                      {
                        label: 'Minimal Plane',
                        value: 'minimal'
                      }
                    ]}
                  />

                </div>

                <SelectField
                  label="Layout Style"
                  value={formData.layout_style}
                  onChange={v =>
                    updateField(
                      'layout_style',
                      v
                    )
                  }
                  icon={<LayoutGrid size={14} />}
                  options={[
                    {
                      label: 'Grid Showcase Array',
                      value: 'grid'
                    },
                    {
                      label:
                        'Vertical Streaming Feed Layout',
                      value: 'feed'
                    }
                  ]}
                />

              </SectionCard>

              {/* ===============================================
                  PRIVACY
              =============================================== */}

              <SectionCard
                icon={<Shield size={17} />}
                title="Privacy & Verification"
                subtitle="Control visibility and profile status"
                accent="cyan"
              >

                {/* PRIVATE ACCOUNT */}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex items-start gap-3">

                      <div className={`
                        w-9 h-9
                        rounded-xl
                        flex items-center justify-center
                        ${
                          formData.is_private
                            ? 'bg-pink-500/10 text-pink-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }
                      `}>
                        {formData.is_private ? (
                          <Lock size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-white">
                          Private Profile
                        </p>

                        <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">
                          Restrict profile content from
                          people who do not follow you.
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
                      className={`
                        relative
                        w-11 h-6
                        rounded-full
                        transition-colors
                        shrink-0
                        ${
                          formData.is_private
                            ? 'bg-cyan-400'
                            : 'bg-white/10'
                        }
                      `}
                    >
                      <span
                        className={`
                          absolute top-1
                          w-4 h-4
                          rounded-full
                          bg-white
                          transition-transform
                          ${
                            formData.is_private
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }
                        `}
                      />
                    </button>

                  </div>

                </div>

                {/* VERIFICATION */}
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
                  icon={<BadgeCheck size={14} />}
                  options={[
                    {
                      label: 'None',
                      value: 'none'
                    },
                    {
                      label: 'Blue Verified',
                      value: 'blue'
                    },
                    {
                      label: 'Gold Organization',
                      value: 'gold'
                    }
                  ]}
                />

              </SectionCard>

              {/* ===============================================
                  FINANCIAL
              =============================================== */}

              <SectionCard
                icon={<Wallet size={17} />}
                title="Financial Settings"
                subtitle="Payment and payout configuration"
                accent="emerald"
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
                  icon={<Smartphone size={14} />}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

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
                    icon={
                      <CircleDollarSign size={14} />
                    }
                    options={[
                      {
                        label: 'Mobile Money',
                        value: 'Mobile Money'
                      },
                      {
                        label: 'Bank Transfer',
                        value: 'Bank Transfer'
                      }
                    ]}
                  />

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">

                    <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
                      Currency
                    </label>

                    <div className="flex items-center gap-2 mt-3">

                      <CircleDollarSign
                        size={16}
                        className="text-emerald-400"
                      />

                      <span className="text-xs font-black text-emerald-300">
                        {formData.currency_preference}
                      </span>

                    </div>
                  </div>

                </div>

              </SectionCard>

            </div>
          </div>

          {/* =================================================
              BOTTOM SAVE AREA
          ================================================= */}

          <div className="mt-8 rounded-3xl border border-cyan-500/10 bg-cyan-500/[0.025] p-5 sm:p-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                  <Settings2
                    size={17}
                    className="text-cyan-400"
                  />
                </div>

                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white">
                    Profile Configuration
                  </h3>

                  <p className="text-[9px] text-zinc-500 mt-1 max-w-xl">
                    All profile changes are saved to your
                    Universe account. Your uploaded media,
                    identity, social links, privacy,
                    appearance and payout settings are
                    included.
                  </p>
                </div>

              </div>

              <button
                onClick={handleUpdate}
                disabled={
                  saving ||
                  uploadingAvatar ||
                  uploadingCover
                }
                className="
                  w-full sm:w-auto
                  flex items-center justify-center gap-2
                  px-7
                  h-12
                  rounded-xl
                  bg-cyan-400
                  text-black
                  text-[9px]
                  font-black
                  uppercase
                  tracking-widest
                  hover:bg-cyan-300
                  hover:shadow-[0_0_30px_rgba(34,211,238,.25)]
                  transition-all
                  disabled:opacity-40
                "
              >
                {saving ? (
                  <>
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                    Saving Changes
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    Save Profile
                  </>
                )}
              </button>

            </div>
          </div>

        </main>
      </div>

      {/* =====================================================
          SUCCESS TOAST
      ===================================================== */}

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
              y: 15,
              scale: 0.95
            }}
            className="
              fixed
              bottom-6
              left-1/2
              -translate-x-1/2
              z-[100]
              flex items-center gap-3
              px-5 py-3.5
              rounded-2xl
              border border-emerald-400/30
              bg-[#07120e]/95
              backdrop-blur-xl
              shadow-[0_0_35px_rgba(16,185,129,.15)]
            "
          >
            <div className="w-7 h-7 rounded-full bg-emerald-400/10 flex items-center justify-center">
              <Check
                size={15}
                className="text-emerald-400"
                strokeWidth={3}
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Profile Saved
              </p>

              <p className="text-[8px] text-zinc-500 mt-0.5">
                Your changes have been synchronized.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ===========================================================
   SECTION CARD
=========================================================== */

const SectionCard = ({
  icon,
  title,
  subtitle,
  accent = 'cyan',
  children
}) => {
  const accentClasses = {
    cyan: {
      border: 'border-cyan-500/15',
      iconBg: 'bg-cyan-500/10',
      iconBorder: 'border-cyan-500/20',
      iconText: 'text-cyan-400',
      line: 'bg-cyan-400'
    },

    purple: {
      border: 'border-purple-500/15',
      iconBg: 'bg-purple-500/10',
      iconBorder: 'border-purple-500/20',
      iconText: 'text-purple-400',
      line: 'bg-purple-400'
    },

    pink: {
      border: 'border-pink-500/15',
      iconBg: 'bg-pink-500/10',
      iconBorder: 'border-pink-500/20',
      iconText: 'text-pink-400',
      line: 'bg-pink-400'
    },

    emerald: {
      border: 'border-emerald-500/15',
      iconBg: 'bg-emerald-500/10',
      iconBorder: 'border-emerald-500/20',
      iconText: 'text-emerald-400',
      line: 'bg-emerald-400'
    }
  };

  const theme =
    accentClasses[accent] ||
    accentClasses.cyan;

  return (
    <section
      className={`
        rounded-3xl
        border
        ${theme.border}
        bg-[#080a12]/90
        backdrop-blur-xl
        p-5 sm:p-6
        shadow-[0_15px_50px_rgba(0,0,0,.15)]
      `}
    >

      <div className="flex items-center gap-3 pb-5 mb-5 border-b border-white/[0.06]">

        <div
          className={`
            w-9 h-9
            rounded-xl
            border
            ${theme.iconBg}
            ${theme.iconBorder}
            ${theme.iconText}
            flex items-center justify-center
          `}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="text-[11px] font-black uppercase tracking-[2px] text-white">
            {title}
          </h3>

          <p className="text-[9px] text-zinc-500 mt-1">
            {subtitle}
          </p>
        </div>

        <div
          className={`ml-auto w-1 h-7 rounded-full ${theme.line} opacity-60`}
        />
      </div>

      <div className="space-y-5">
        {children}
      </div>
    </section>
  );
};

/* ===========================================================
   INPUT FIELD
=========================================================== */

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  icon
}) => {
  return (
    <div>
      <label className="block mb-2 text-[8px] font-black uppercase tracking-[1.5px] text-zinc-500">
        {label}
      </label>

      <div className="
        flex items-center gap-3
        rounded-xl
        border border-white/[0.08]
        bg-white/[0.025]
        px-3.5
        transition-all
        focus-within:border-cyan-400/40
        focus-within:bg-cyan-400/[0.02]
      ">

        {icon && (
          <span className="text-cyan-400/70 shrink-0">
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
          className="
            w-full
            h-11
            bg-transparent
            outline-none
            border-none
            text-xs
            font-semibold
            text-white
            placeholder:text-zinc-700
          "
        />
      </div>
    </div>
  );
};

/* ===========================================================
   TEXTAREA
=========================================================== */

const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder
}) => {
  return (
    <div>
      <label className="block mb-2 text-[8px] font-black uppercase tracking-[1.5px] text-zinc-500">
        {label}
      </label>

      <div className="
        rounded-xl
        border border-white/[0.08]
        bg-white/[0.025]
        px-3.5
        py-3
        transition-all
        focus-within:border-cyan-400/40
        focus-within:bg-cyan-400/[0.02]
      ">

        <textarea
          rows={4}
          value={value || ''}
          onChange={e =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          className="
            w-full
            bg-transparent
            outline-none
            border-none
            resize-none
            text-xs
            font-semibold
            leading-relaxed
            text-white
            placeholder:text-zinc-700
          "
        />
      </div>
    </div>
  );
};

/* ===========================================================
   SELECT FIELD
=========================================================== */

const SelectField = ({
  label,
  value,
  onChange,
  options,
  icon
}) => {
  const normalizedOptions = options.map(option =>
    typeof option === 'string'
      ? {
          label: option,
          value: option
        }
      : option
  );

  return (
    <div>
      <label className="block mb-2 text-[8px] font-black uppercase tracking-[1.5px] text-zinc-500">
        {label}
      </label>

      <div className="
        flex items-center gap-3
        rounded-xl
        border border-white/[0.08]
        bg-white/[0.025]
        px-3.5
        h-11
        focus-within:border-cyan-400/40
      ">

        {icon && (
          <span className="text-cyan-400/70 shrink-0">
            {icon}
          </span>
        )}

        <select
          value={value ?? ''}
          onChange={e =>
            onChange(e.target.value)
          }
          className="
            w-full
            bg-transparent
            border-none
            outline-none
            text-xs
            font-bold
            text-white
            cursor-pointer
          "
        >
          {normalizedOptions.map(option => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/* ===========================================================
   DATE FIELD
=========================================================== */

const DateField = ({
  label,
  value,
  onChange
}) => {
  return (
    <div>
      <label className="block mb-2 text-[8px] font-black uppercase tracking-[1.5px] text-zinc-500">
        {label}
      </label>

      <div className="
        flex items-center gap-3
        rounded-xl
        border border-white/[0.08]
        bg-white/[0.025]
        px-3.5
        h-11
        focus-within:border-emerald-400/40
      ">

        <Calendar
          size={14}
          className="text-emerald-400/80 shrink-0"
        />

        <input
          type="date"
          value={value || ''}
          onChange={e =>
            onChange(e.target.value)
          }
          className="
            w-full
            bg-transparent
            border-none
            outline-none
            text-xs
            font-bold
            text-white
            cursor-pointer
          "
        />
      </div>
    </div>
  );
};

export default EditProfile;
