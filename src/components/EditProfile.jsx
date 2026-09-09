// src/pages/EditProfile.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  ChevronLeft,
  Camera,
  Check,
  Globe,
  Fingerprint,
  Cpu,
  Share2,
  Eye,
  EyeOff,
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
  Loader2,
  Image as ImageIcon,
  Save,
  LayoutGrid,
  Settings2,
  Map,
  CircleDollarSign,
  BadgeCheck,
  UserRound,
  X,
  Upload,
  Trash2,
  Plus,
  Search,
  Video,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Monitor,
  Smartphone as MobileIcon,
  Link2,
  AtSign,
  MessageCircle,
  Users,
  Bell,
  KeyRound,
  LogOut,
  Download,
  UserX,
  UserCheck,
  Languages,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  QrCode,
  Copy,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  UserCog,
  Radio,
  Gift,
  Coins,
  Crown,
  BarChart3,
  Megaphone,
  SearchCheck,
  Globe2,
  Database,
  SmartphoneNfc,
  Fingerprint as FingerprintIcon,
  FileText,
  Building2
} from 'lucide-react';

import { supabase } from '../supabaseClient';


// ============================================================
// CONSTANTS
// ============================================================

const INTEREST_OPTIONS = [
  'Music',
  'Comedy',
  'Lake Vibes',
  'Tech',
  'Art',
  'Sports',
  'Fashion',
  'Football',
  'Gaming',
  'Travel',
  'Food',
  'Education',
  'Business',
  'Fitness',
  'Photography',
  'Movies',
  'Dance',
  'Programming',
  'Nature',
  'Lifestyle',
  'News',
  'Motivation',
  'Beauty',
  'Cars',
  'Entrepreneurship'
];

const DISTRICTS = [
  'Blantyre',
  'Lilongwe',
  'Mzuzu',
  'Nkhotakota',
  'Zomba',
  'Kasungu',
  'Mangochi',
  'Mchinji',
  'Mulanje',
  'Mwanza',
  'Neno',
  'Nsanje',
  'Ntcheu',
  'Ntchisi',
  'Phalombe',
  'Rumphi',
  'Salima',
  'Thyolo',
  'Chikwawa',
  'Chitipa',
  'Dedza',
  'Dowa',
  'Karonga',
  'Likoma',
  'Machinga'
];

const SOCIAL_PLATFORMS = [
  'website',
  'youtube',
  'whatsapp',
  'instagram',
  'tiktok',
  'facebook',
  'twitter',
  'telegram',
  'snapchat',
  'linkedin',
  'discord',
  'github'
];

const DEFAULT_SOCIALS = {
  website: '',
  youtube: '',
  whatsapp: '',
  instagram: '',
  tiktok: '',
  facebook: '',
  twitter: '',
  telegram: '',
  snapchat: '',
  linkedin: '',
  discord: '',
  github: '',
  custom: []
};

const DEFAULT_VISIBILITY = {
  profile: 'public',
  birthday: 'followers',
  gender: 'followers',
  phone: 'private',
  location: 'followers',
  socialLinks: 'public',
  interests: 'public',
  likedVideos: 'private',
  savedVideos: 'private',
  followers: 'public',
  following: 'public',
  onlineStatus: 'followers',
  lastSeen: 'followers',
  activityStatus: 'followers'
};

const DEFAULT_PRIVACY = {
  whoCanFollow: 'everyone',
  whoCanMessage: 'everyone',
  whoCanComment: 'everyone',
  whoCanMention: 'everyone',
  whoCanTag: 'everyone',
  whoCanRepost: 'followers',
  whoCanDownloadVideos: 'everyone',
  readReceipts: true,
  tagApproval: false,
  followRequests: true,
  showActivity: true
};

const DEFAULT_DISCOVERY = {
  searchable: true,
  suggestedAccounts: true,
  contactSync: false,
  friendDiscovery: true,
  profileIndexing: true,
  searchEngineVisibility: true,
  allowProfileSharing: true
};

const DEFAULT_APPEARANCE = {
  theme: 'neon',
  customBackground: '',
  backgroundImage: '',
  backgroundAnimation: true,
  font: 'Inter',
  cardStyle: 'glass',
  gridStyle: 'modern',
  headerStyle: 'cover',
  avatarShape: 'circle',
  coverStyle: 'cinematic',
  neonIntensity: 80,
  animationIntensity: 70,
  reducedMotion: false
};

const DEFAULT_MEDIA = {
  videoEnabled: true,
  videoAutoplay: false,
  videoLoop: true,
  musicAutoplay: false,
  musicLoop: true,
  mediaVisibility: 'public',
  videoThumbnail: '',
  coverPosition: 'center'
};

const DEFAULT_CONTENT = {
  pinnedVideo: '',
  featuredVideos: [],
  featuredPlaylist: '',
  repostsVisibility: 'followers',
  likedVideosVisibility: 'private',
  savedContentVisibility: 'private',
  contentOrder: 'latest',
  showPlaylists: true
};

const DEFAULT_CREATOR = {
  creatorMode: false,
  professionalProfile: false,
  creatorCategory: '',
  businessContact: '',
  analyticsEnabled: true,
  monetizationEnabled: false,
  giftsEnabled: true,
  subscriptionsEnabled: false,
  paidContentEnabled: false,
  promotionEnabled: true
};

const DEFAULT_INTEREST_SETTINGS = {
  custom: [],
  discovery: true,
  ordered: []
};

const DEFAULT_ACCOUNT = {
  accountType: 'personal',
  profileCategory: '',
  nickname: '',
  headline: '',
  pronunciation: '',
  pronouns: '',
  nameVisibility: 'public'
};


// ============================================================
// HELPERS
// ============================================================

const clone = value => JSON.parse(JSON.stringify(value));

const mergeDeep = (base, value) => ({
  ...base,
  ...(value || {})
});

const safeArray = value => (
  Array.isArray(value) ? value : []
);

const safeString = value => (
  typeof value === 'string' ? value : ''
);

const normalizeDate = value => {
  if (!value) return '';
  return String(value).slice(0, 10);
};


// ============================================================
// COMPONENT
// ============================================================

const EditProfile = () => {
  const navigate = useNavigate();

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const musicInputRef = useRef(null);
  const backgroundInputRef = useRef(null);

  const initialSnapshotRef = useRef('');
  const currentUserIdRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const usernameTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [activeSection, setActiveSection] = useState('profile');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [previewPublic, setPreviewPublic] = useState(true);

  const [showStatus, setShowStatus] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showCustomSocial, setShowCustomSocial] = useState(false);

  const [interestSearch, setInterestSearch] = useState('');

  const [usernameState, setUsernameState] = useState({
    checking: false,
    available: null,
    message: ''
  });

  const [autoSave, setAutoSave] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

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

  const [account, setAccount] = useState(clone(DEFAULT_ACCOUNT));

  const [socials, setSocials] = useState(
    clone(DEFAULT_SOCIALS)
  );

  const [visibility, setVisibility] = useState(
    clone(DEFAULT_VISIBILITY)
  );

  const [privacy, setPrivacy] = useState(
    clone(DEFAULT_PRIVACY)
  );

  const [discovery, setDiscovery] = useState(
    clone(DEFAULT_DISCOVERY)
  );

  const [appearance, setAppearance] = useState(
    clone(DEFAULT_APPEARANCE)
  );

  const [mediaSettings, setMediaSettings] = useState(
    clone(DEFAULT_MEDIA)
  );

  const [contentSettings, setContentSettings] = useState(
    clone(DEFAULT_CONTENT)
  );

  const [creator, setCreator] = useState(
    clone(DEFAULT_CREATOR)
  );

  const [interestSettings, setInterestSettings] = useState(
    clone(DEFAULT_INTEREST_SETTINGS)
  );

  const [personal, setPersonal] = useState({
    relationshipStatus: '',
    occupation: '',
    education: '',
    school: '',
    skills: '',
    languages: ''
  });

  const [locationSettings, setLocationSettings] = useState({
    country: 'Malawi',
    region: 'Southern Region',
    city: '',
    gpsSharing: false,
    hideExactLocation: true,
    visibility: 'followers'
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    loginAlerts: true
  });

  const [accountSecurity, setAccountSecurity] = useState({
    email: '',
    newEmail: '',
    newPassword: '',
    confirmPassword: '',
    newPhone: ''
  });

  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: ''
  });

  const [monetization, setMonetization] = useState({
    payoutMinimum: 1000,
    payoutSchedule: 'monthly',
    taxInformation: '',
    giftEarnings: true,
    coinEarnings: true,
    withdrawalsEnabled: true,
    paymentVerified: false
  });

  const [customInterest, setCustomInterest] = useState('');

  const [verification, setVerification] = useState({
    type: 'personal',
    status: 'not_requested',
    information: '',
    organizationName: '',
    organizationWebsite: '',
    requestMessage: ''
  });

  // ============================================================
  // DERIVED VALUES
  // ============================================================

  const filteredInterests = useMemo(() => {
    const query = interestSearch.trim().toLowerCase();

    if (!query) {
      return INTEREST_OPTIONS;
    }

    return INTEREST_OPTIONS.filter(item =>
      item.toLowerCase().includes(query)
    );
  }, [interestSearch]);

  const profileCompletion = useMemo(() => {
    const checks = [
      formData.full_name,
      formData.username,
      formData.bio,
      formData.avatar_url,
      formData.cover_url,
      formData.status_message,
      account.headline,
      account.nickname,
      account.profileCategory,
      account.pronouns,
      formData.district,
      formData.location,
      personal.occupation,
      personal.education,
      personal.school,
      personal.skills,
      personal.languages,
      formData.interests.length > 0,
      Object.values(socials).some(value =>
        Array.isArray(value)
          ? value.length > 0
          : Boolean(value)
      )
    ];

    const completed = checks.filter(Boolean).length;

    return Math.round(
      (completed / checks.length) * 100
    );
  }, [
    formData,
    account,
    personal,
    socials
  ]);

  const isUploading =
    uploadingAvatar ||
    uploadingCover ||
    uploadingVideo ||
    uploadingMusic ||
    uploadingBackground;

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      formData,
      account,
      socials,
      visibility,
      privacy,
      discovery,
      appearance,
      mediaSettings,
      contentSettings,
      creator,
      interestSettings,
      personal,
      locationSettings,
      security,
      bankDetails,
      monetization,
      verification
    });
  }, [
    formData,
    account,
    socials,
    visibility,
    privacy,
    discovery,
    appearance,
    mediaSettings,
    contentSettings,
    creator,
    interestSettings,
    personal,
    locationSettings,
    security,
    bankDetails,
    monetization,
    verification
  ]);

  const isDirty =
    currentSnapshot !== initialSnapshotRef.current;

  // ============================================================
  // FIELD HELPERS
  // ============================================================

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateAccount = useCallback((field, value) => {
    setAccount(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateVisibility = useCallback((field, value) => {
    setVisibility(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updatePrivacy = useCallback((field, value) => {
    setPrivacy(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateDiscovery = useCallback((field, value) => {
    setDiscovery(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateAppearance = useCallback((field, value) => {
    setAppearance(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateMedia = useCallback((field, value) => {
    setMediaSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateContent = useCallback((field, value) => {
    setContentSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateCreator = useCallback((field, value) => {
    setCreator(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updatePersonal = useCallback((field, value) => {
    setPersonal(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateLocation = useCallback((field, value) => {
    setLocationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateSocial = useCallback((field, value) => {
    setSocials(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // ============================================================
  // FETCH PROFILE
  // ============================================================

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const {
        data: {
          user
        },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate('/login');
        return;
      }

      currentUserIdRef.current = user.id;

      const {
        data,
        error
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      const rawSocials =
        data?.social_links &&
        typeof data.social_links === 'object'
          ? data.social_links
          : {};

      const savedSettings =
        rawSocials?._profile_settings &&
        typeof rawSocials._profile_settings === 'object'
          ? rawSocials._profile_settings
          : {};

      setFormData({
        username: safeString(data?.username),
        full_name: safeString(data?.full_name),
        bio: safeString(data?.bio),
        avatar_url: safeString(data?.avatar_url),
        cover_url: safeString(data?.cover_url),
        profile_video_url: safeString(data?.profile_video_url),
        profile_music_url: safeString(data?.profile_music_url),
        status_message: safeString(data?.status_message),
        district: safeString(data?.district) || 'Blantyre',
        interests: safeArray(data?.interests),
        phone_number: safeString(data?.phone_number),
        gender: safeString(data?.gender),
        dob: normalizeDate(data?.dob),
        location: safeString(data?.location),
        theme_preference:
          safeString(data?.theme_preference) || 'neon',
        accent_color:
          safeString(data?.accent_color) || '#06b6d4',
        layout_style:
          safeString(data?.layout_style) || 'grid',
        payout_method:
          safeString(data?.payout_method) || 'Mobile Money',
        currency_preference:
          safeString(data?.currency_preference) || 'MWK',
        is_private: Boolean(data?.is_private),
        verified_status:
          safeString(data?.verified_status) || 'none'
      });

      setAccount(
        mergeDeep(
          DEFAULT_ACCOUNT,
          savedSettings.account
        )
      );

      setSocials(
        mergeDeep(
          DEFAULT_SOCIALS,
          rawSocials
        )
      );

      setVisibility(
        mergeDeep(
          DEFAULT_VISIBILITY,
          savedSettings.visibility
        )
      );

      setPrivacy(
        mergeDeep(
          DEFAULT_PRIVACY,
          savedSettings.privacy
        )
      );

      setDiscovery(
        mergeDeep(
          DEFAULT_DISCOVERY,
          savedSettings.discovery
        )
      );

      setAppearance(
        mergeDeep(
          DEFAULT_APPEARANCE,
          savedSettings.appearance
        )
      );

      setMediaSettings(
        mergeDeep(
          DEFAULT_MEDIA,
          savedSettings.mediaSettings
        )
      );

      setContentSettings(
        mergeDeep(
          DEFAULT_CONTENT,
          savedSettings.contentSettings
        )
      );

      setCreator(
        mergeDeep(
          DEFAULT_CREATOR,
          savedSettings.creator
        )
      );

      setInterestSettings(
        mergeDeep(
          DEFAULT_INTEREST_SETTINGS,
          savedSettings.interestSettings
        )
      );

      setPersonal(
        mergeDeep(
          {
            relationshipStatus: '',
            occupation: '',
            education: '',
            school: '',
            skills: '',
            languages: ''
          },
          savedSettings.personal
        )
      );

      setLocationSettings(
        mergeDeep(
          {
            country: 'Malawi',
            region: 'Southern Region',
            city: '',
            gpsSharing: false,
            hideExactLocation: true,
            visibility: 'followers'
          },
          savedSettings.locationSettings
        )
      );

      setSecurity(
        mergeDeep(
          {
            twoFactorEnabled: false,
            loginAlerts: true
          },
          savedSettings.security
        )
      );

      setBankDetails(
        mergeDeep(
          {
            bankName: '',
            accountName: '',
            accountNumber: '',
            branch: ''
          },
          savedSettings.bankDetails
        )
      );

      setMonetization(
        mergeDeep(
          {
            payoutMinimum: 1000,
            payoutSchedule: 'monthly',
            taxInformation: '',
            giftEarnings: true,
            coinEarnings: true,
            withdrawalsEnabled: true,
            paymentVerified: false
          },
          savedSettings.monetization
        )
      );

      setVerification(
        mergeDeep(
          {
            type: 'personal',
            status: 'not_requested',
            information: '',
            organizationName: '',
            organizationWebsite: '',
            requestMessage: ''
          },
          savedSettings.verification
        )
      );

      setAccountSecurity(prev => ({
        ...prev,
        email: user.email || ''
      }));

      setTimeout(() => {
        initialSnapshotRef.current = JSON.stringify({
          formData: {
            username: safeString(data?.username),
            full_name: safeString(data?.full_name),
            bio: safeString(data?.bio),
            avatar_url: safeString(data?.avatar_url),
            cover_url: safeString(data?.cover_url),
            profile_video_url: safeString(data?.profile_video_url),
            profile_music_url: safeString(data?.profile_music_url),
            status_message: safeString(data?.status_message),
            district: safeString(data?.district) || 'Blantyre',
            interests: safeArray(data?.interests),
            phone_number: safeString(data?.phone_number),
            gender: safeString(data?.gender),
            dob: normalizeDate(data?.dob),
            location: safeString(data?.location),
            theme_preference:
              safeString(data?.theme_preference) || 'neon',
            accent_color:
              safeString(data?.accent_color) || '#06b6d4',
            layout_style:
              safeString(data?.layout_style) || 'grid',
            payout_method:
              safeString(data?.payout_method) || 'Mobile Money',
            currency_preference:
              safeString(data?.currency_preference) || 'MWK',
            is_private: Boolean(data?.is_private),
            verified_status:
              safeString(data?.verified_status) || 'none'
          },
          account: mergeDeep(
            DEFAULT_ACCOUNT,
            savedSettings.account
          ),
          socials: mergeDeep(
            DEFAULT_SOCIALS,
            rawSocials
          ),
          visibility: mergeDeep(
            DEFAULT_VISIBILITY,
            savedSettings.visibility
          ),
          privacy: mergeDeep(
            DEFAULT_PRIVACY,
            savedSettings.privacy
          ),
          discovery: mergeDeep(
            DEFAULT_DISCOVERY,
            savedSettings.discovery
          ),
          appearance: mergeDeep(
            DEFAULT_APPEARANCE,
            savedSettings.appearance
          ),
          mediaSettings: mergeDeep(
            DEFAULT_MEDIA,
            savedSettings.mediaSettings
          ),
          contentSettings: mergeDeep(
            DEFAULT_CONTENT,
            savedSettings.contentSettings
          ),
          creator: mergeDeep(
            DEFAULT_CREATOR,
            savedSettings.creator
          ),
          interestSettings: mergeDeep(
            DEFAULT_INTEREST_SETTINGS,
            savedSettings.interestSettings
          ),
          personal: mergeDeep(
            {
              relationshipStatus: '',
              occupation: '',
              education: '',
              school: '',
              skills: '',
              languages: ''
            },
            savedSettings.personal
          ),
          locationSettings: mergeDeep(
            {
              country: 'Malawi',
              region: 'Southern Region',
              city: '',
              gpsSharing: false,
              hideExactLocation: true,
              visibility: 'followers'
            },
            savedSettings.locationSettings
          ),
          security: mergeDeep(
            {
              twoFactorEnabled: false,
              loginAlerts: true
            },
            savedSettings.security
          ),
          bankDetails: mergeDeep(
            {
              bankName: '',
              accountName: '',
              accountNumber: '',
              branch: ''
            },
            savedSettings.bankDetails
          ),
          monetization: mergeDeep(
            {
              payoutMinimum: 1000,
              payoutSchedule: 'monthly',
              taxInformation: '',
              giftEarnings: true,
              coinEarnings: true,
              withdrawalsEnabled: true,
              paymentVerified: false
            },
            savedSettings.monetization
          ),
          verification: mergeDeep(
            {
              type: 'personal',
              status: 'not_requested',
              information: '',
              organizationName: '',
              organizationWebsite: '',
              requestMessage: ''
            },
            savedSettings.verification
          )
        });
      }, 0);

    } catch (error) {
      console.error('EditProfile fetch error:', error);

      setErrorMessage(
        error?.message ||
        'Unable to load your profile.'
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    let mounted = true;

    if (mounted) {
      fetchProfile();
    }

    return () => {
      mounted = false;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      if (usernameTimerRef.current) {
        clearTimeout(usernameTimerRef.current);
      }
    };
  }, [fetchProfile]);

  // ============================================================
  // UNSAVED CHANGES
  // ============================================================

  useEffect(() => {
    const handleBeforeUnload = event => {
      if (!isDirty) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, [isDirty]);

  // ============================================================
  // USERNAME CHECK
  // ============================================================

  const checkUsername = useCallback(
    value => {
      const username = value.trim().toLowerCase();

      if (!username) {
        setUsernameState({
          checking: false,
          available: null,
          message: ''
        });
        return;
      }

      if (username.length < 3) {
        setUsernameState({
          checking: false,
          available: false,
          message: 'Username must contain at least 3 characters.'
        });
        return;
      }

      if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
        setUsernameState({
          checking: false,
          available: false,
          message: 'Only letters, numbers, underscores and dots are allowed.'
        });
        return;
      }

      if (usernameTimerRef.current) {
        clearTimeout(usernameTimerRef.current);
      }

      setUsernameState({
        checking: true,
        available: null,
        message: 'Checking availability...'
      });

      usernameTimerRef.current = setTimeout(
        async () => {
          try {
            const {
              data: {
                user
              }
            } = await supabase.auth.getUser();

            if (!user) return;

            const {
              data,
              error
            } = await supabase
              .from('profiles')
              .select('id')
              .eq('username', username)
              .neq('id', user.id)
              .limit(1);

            if (error) {
              throw error;
            }

            const available = !data?.length;

            setUsernameState({
              checking: false,
              available,
              message: available
                ? 'Username is available.'
                : 'Username is already taken.'
            });
          } catch (error) {
            console.error(
              'Username availability error:',
              error
            );

            setUsernameState({
              checking: false,
              available: null,
              message: 'Could not check username.'
            });
          }
        },
        500
      );
    },
    []
  );

  // ============================================================
  // INTERESTS
  // ============================================================

  const toggleInterest = interest => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(
            item => item !== interest
          )
        : [
            ...prev.interests,
            interest
          ]
    }));
  };

  const addCustomInterest = () => {
    const value = customInterest.trim();

    if (!value) return;

    const exists =
      formData.interests.some(
        item =>
          item.toLowerCase() === value.toLowerCase()
      );

    if (!exists) {
      setFormData(prev => ({
        ...prev,
        interests: [
          ...prev.interests,
          value
        ]
      }));
    }

    setInterestSettings(prev => ({
      ...prev,
      custom: prev.custom.includes(value)
        ? prev.custom
        : [
            ...prev.custom,
            value
          ]
    }));

    setCustomInterest('');
  };

  const removeInterest = interest => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(
        item => item !== interest
      )
    }));
  };

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const uploadFile = async (
    file,
    bucket,
    type,
    setter,
    acceptedTypes
  ) => {
    if (!file) return;

    if (
      !acceptedTypes.some(
        typeValue =>
          file.type.startsWith(typeValue) ||
          file.type === typeValue
      )
    ) {
      setErrorMessage(
        `Invalid ${type} file type.`
      );
      return;
    }

    try {
      setter(true);

      const {
        data: {
          user
        },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError || new Error(
          'You must be logged in.'
        );
      }

      const extension =
        file.name.split('.').pop() || 'bin';

      const fileName =
        `${user.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

      const {
        error: uploadError
      } = await supabase.storage
        .from(bucket)
        .upload(
          fileName,
          file,
          {
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicData
      } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const publicUrl =
        publicData?.publicUrl || '';

      if (!publicUrl) {
        throw new Error(
          'Unable to create public media URL.'
        );
      }

      if (type === 'avatar') {
        updateField(
          'avatar_url',
          publicUrl
        );
      }

      if (type === 'cover') {
        updateField(
          'cover_url',
          publicUrl
        );
      }

      if (type === 'video') {
        updateField(
          'profile_video_url',
          publicUrl
        );
      }

      if (type === 'music') {
        updateField(
          'profile_music_url',
          publicUrl
        );
      }

      if (type === 'background') {
        updateAppearance(
          'backgroundImage',
          publicUrl
        );
      }

      setSuccessMessage(
        `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded.`
      );

      setTimeout(
        () => setSuccessMessage(''),
        2500
      );

    } catch (error) {
      console.error(
        `${type} upload error:`,
        error
      );

      setErrorMessage(
        error?.message ||
        `Unable to upload ${type}.`
      );
    } finally {
      setter(false);
    }
  };

  const handleAvatarUpload = event => {
    const file = event.target.files?.[0];

    uploadFile(
      file,
      'avatars',
      'avatar',
      setUploadingAvatar,
      ['image/']
    );

    event.target.value = '';
  };

  const handleCoverUpload = event => {
    const file = event.target.files?.[0];

    uploadFile(
      file,
      'covers',
      'cover',
      setUploadingCover,
      ['image/']
    );

    event.target.value = '';
  };

  const handleVideoUpload = event => {
    const file = event.target.files?.[0];

    uploadFile(
      file,
      'profile-media',
      'video',
      setUploadingVideo,
      ['video/']
    );

    event.target.value = '';
  };

  const handleMusicUpload = event => {
    const file = event.target.files?.[0];

    uploadFile(
      file,
      'profile-media',
      'music',
      setUploadingMusic,
      ['audio/']
    );

    event.target.value = '';
  };

  const handleBackgroundUpload = event => {
    const file = event.target.files?.[0];

    uploadFile(
      file,
      'profile-media',
      'background',
      setUploadingBackground,
      ['image/']
    );

    event.target.value = '';
  };

  // ============================================================
  // MEDIA REMOVE
  // ============================================================

  const removeMedia = type => {
    if (type === 'avatar') {
      updateField('avatar_url', '');
    }

    if (type === 'cover') {
      updateField('cover_url', '');
    }

    if (type === 'video') {
      updateField('profile_video_url', '');
    }

    if (type === 'music') {
      updateField('profile_music_url', '');
    }

    if (type === 'background') {
      updateAppearance(
        'backgroundImage',
        ''
      );
    }
  };

  // ============================================================
  // SAVE
  // ============================================================

  const saveProfile = useCallback(
    async ({
      silent = false
    } = {}) => {
      if (saving || isUploading) {
        return false;
      }

      try {
        setSaving(true);

        const {
          data: {
            user
          },
          error: userError
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw userError || new Error(
            'You must be logged in.'
          );
        }

        const extendedSettings = {
          account,
          visibility,
          privacy,
          discovery,
          appearance,
          mediaSettings,
          contentSettings,
          creator,
          interestSettings,
          personal,
          locationSettings,
          security,
          bankDetails,
          monetization,
          verification,
          savedAt: new Date().toISOString()
        };

        const existingSocials = {
          ...socials
        };

        delete existingSocials._profile_settings;

        const profilePayload = {
          username: formData.username.trim(),
          full_name: formData.full_name.trim(),
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          cover_url: formData.cover_url,
          profile_video_url:
            formData.profile_video_url,
          profile_music_url:
            formData.profile_music_url,
          status_message:
            formData.status_message,
          district:
            formData.district,
          interests:
            formData.interests,
          phone_number:
            formData.phone_number,
          gender:
            formData.gender,
          dob:
            formData.dob || null,
          location:
            locationSettings.hideExactLocation
              ? formData.location
              : formData.location,
          theme_preference:
            appearance.theme,
          accent_color:
            formData.accent_color,
          layout_style:
            formData.layout_style,
          payout_method:
            formData.payout_method,
          currency_preference:
            formData.currency_preference,
          is_private:
            formData.is_private,

          social_links: {
            ...existingSocials,
            _profile_settings:
              extendedSettings
          }
        };

        const {
          error
        } = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('id', user.id);

        if (error) {
          throw error;
        }

        initialSnapshotRef.current =
          currentSnapshot;

        setLastSaved(
          new Date()
        );

        if (!silent) {
          setSuccessMessage(
            'Profile saved successfully.'
          );

          setTimeout(
            () => setSuccessMessage(''),
            3000
          );
        }

        return true;

      } catch (error) {
        console.error(
          'Save profile error:',
          error
        );

        if (!silent) {
          setErrorMessage(
            error?.message ||
            'Unable to save your profile.'
          );
        }

        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      saving,
      isUploading,
      account,
      visibility,
      privacy,
      discovery,
      appearance,
      mediaSettings,
      contentSettings,
      creator,
      interestSettings,
      personal,
      locationSettings,
      security,
      bankDetails,
      monetization,
      verification,
      socials,
      formData,
      currentSnapshot
    ]
  );

  // ============================================================
  // AUTO SAVE
  // ============================================================

  useEffect(() => {
    if (!autoSave || !isDirty || loading) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(
        autoSaveTimerRef.current
      );
    }

    autoSaveTimerRef.current =
      setTimeout(() => {
        saveProfile({
          silent: true
        });
      }, 2500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(
          autoSaveTimerRef.current
        );
      }
    };
  }, [
    autoSave,
    isDirty,
    loading,
    saveProfile
  ]);

  // ============================================================
  // RESET
  // ============================================================

  const resetAll = () => {
    if (
      !window.confirm(
        'Reset all profile changes?'
      )
    ) {
      return;
    }

    fetchProfile();
  };

  const resetSection = section => {
    if (
      !window.confirm(
        `Reset ${section} settings?`
      )
    ) {
      return;
    }

    switch (section) {
      case 'appearance':
        setAppearance(
          clone(DEFAULT_APPEARANCE)
        );
        break;

      case 'privacy':
        setPrivacy(
          clone(DEFAULT_PRIVACY)
        );
        setVisibility(
          clone(DEFAULT_VISIBILITY)
        );
        break;

      case 'discovery':
        setDiscovery(
          clone(DEFAULT_DISCOVERY)
        );
        break;

      case 'media':
        setMediaSettings(
          clone(DEFAULT_MEDIA)
        );
        break;

      case 'creator':
        setCreator(
          clone(DEFAULT_CREATOR)
        );
        break;

      case 'content':
        setContentSettings(
          clone(DEFAULT_CONTENT)
        );
        break;

      default:
        break;
    }
  };

  const handleBack = () => {
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes. Leave anyway?'
      )
    ) {
      return;
    }

    navigate(-1);
  };

  // ============================================================
  // AUTH ACTIONS
  // ============================================================

  const changeEmail = async () => {
    if (!accountSecurity.newEmail.trim()) {
      setErrorMessage(
        'Enter your new email address.'
      );
      return;
    }

    try {
      const {
        error
      } = await supabase.auth.updateUser({
        email:
          accountSecurity.newEmail.trim()
      });

      if (error) throw error;

      setSuccessMessage(
        'Email change requested. Check your email to confirm.'
      );

      setAccountSecurity(prev => ({
        ...prev,
        newEmail: ''
      }));

    } catch (error) {
      setErrorMessage(
        error?.message ||
        'Unable to change email.'
      );
    }
  };

  const changePassword = async () => {
    if (
      accountSecurity.newPassword.length < 6
    ) {
      setErrorMessage(
        'Password must contain at least 6 characters.'
      );
      return;
    }

    if (
      accountSecurity.newPassword !==
      accountSecurity.confirmPassword
    ) {
      setErrorMessage(
        'Passwords do not match.'
      );
      return;
    }

    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password:
          accountSecurity.newPassword
      });

      if (error) throw error;

      setSuccessMessage(
        'Password updated successfully.'
      );

      setAccountSecurity(prev => ({
        ...prev,
        newPassword: '',
        confirmPassword: ''
      }));

    } catch (error) {
      setErrorMessage(
        error?.message ||
        'Unable to change password.'
      );
    }
  };

  const logoutAllDevices = async () => {
    if (
      !window.confirm(
        'Log out from all active sessions?'
      )
    ) {
      return;
    }

    try {
      const {
        error
      } = await supabase.auth.signOut({
        scope: 'global'
      });

      if (error) throw error;

      navigate('/login');

    } catch (error) {
      setErrorMessage(
        error?.message ||
        'Unable to log out all devices.'
      );
    }
  };

  const enableTwoFactor = async () => {
    try {
      if (
        !supabase.auth.mfa ||
        !supabase.auth.mfa.enroll
      ) {
        setErrorMessage(
          'Two-factor authentication is not available in this Supabase client.'
        );
        return;
      }

      const {
        data,
        error
      } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Con-Universe Authenticator'
      });

      if (error) throw error;

      setSecurity(prev => ({
        ...prev,
        twoFactorEnabled: true
      }));

      setSuccessMessage(
        '2FA setup started.'
      );

      console.log(
        'MFA setup data:',
        data
      );

    } catch (error) {
      setErrorMessage(
        error?.message ||
        'Unable to enable 2FA.'
      );
    }
  };

  // ============================================================
  // PROFILE SHARING
  // ============================================================

  const profileUrl = useMemo(() => {
    if (!formData.username) {
      return window.location.origin;
    }

    return `${window.location.origin}/@${formData.username}`;
  }, [formData.username]);

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(
        profileUrl
      );

      setSuccessMessage(
        'Profile link copied.'
      );

      setTimeout(
        () => setSuccessMessage(''),
        2000
      );

    } catch {
      setErrorMessage(
        'Unable to copy profile link.'
      );
    }
  };

  const shareProfile = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title:
            account.nickname ||
            formData.full_name ||
            formData.username,
          text:
            account.headline ||
            formData.bio ||
            'Check out my profile.',
          url: profileUrl
        });
      } else {
        await copyProfileLink();
      }
    } catch (error) {
      if (
        error?.name !== 'AbortError'
      ) {
        setErrorMessage(
          'Unable to share profile.'
        );
      }
    }
  };

  // ============================================================
  // VERIFICATION
  // ============================================================

  const submitVerification = () => {
    if (
      !verification.requestMessage.trim()
    ) {
      setErrorMessage(
        'Write a verification request message.'
      );
      return;
    }

    setVerification(prev => ({
      ...prev,
      status: 'pending'
    }));

    setSuccessMessage(
      'Verification request prepared. Save your profile to keep the request.'
    );
  };

  // ============================================================
  // SECTION NAVIGATION
  // ============================================================

  const sections = [
    {
      id: 'profile',
      label: 'Profile',
      icon: UserRound
    },
    {
      id: 'media',
      label: 'Media',
      icon: Film
    },
    {
      id: 'social',
      label: 'Social Links',
      icon: Share2
    },
    {
      id: 'personal',
      label: 'Personal',
      icon: Fingerprint
    },
    {
      id: 'interests',
      label: 'Interests',
      icon: Heart
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: Shield
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: Palette
    },
    {
      id: 'content',
      label: 'Content',
      icon: LayoutGrid
    },
    {
      id: 'creator',
      label: 'Creator',
      icon: Crown
    },
    {
      id: 'discovery',
      label: 'Discovery',
      icon: SearchCheck
    },
    {
      id: 'verification',
      label: 'Verification',
      icon: BadgeCheck
    },
    {
      id: 'financial',
      label: 'Financial',
      icon: Wallet
    },
    {
      id: 'security',
      label: 'Security',
      icon: Lock
    },
    {
      id: 'account',
      label: 'Account',
      icon: Settings2
    },
    {
      id: 'preview',
      label: 'Preview',
      icon: Eye
    }
  ];

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Cpu
              size={22}
              className="absolute inset-0 m-auto text-cyan-400"
            />
          </div>

          <p className="text-sm text-cyan-300">
            Loading profile system...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">

      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-fuchsia-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/90 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
            >
              <ChevronLeft size={20} />
            </button>

            <div>
              <h1 className="font-bold text-lg">
                Edit Profile
              </h1>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>
                  {isDirty
                    ? 'Unsaved changes'
                    : lastSaved
                      ? `Saved ${lastSaved.toLocaleTimeString()}`
                      : 'All changes saved'}
                </span>

                {isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Profile completion
              </div>

              <div className="text-sm font-semibold text-cyan-300">
                {profileCompletion}%
              </div>
            </div>

            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all"
                style={{
                  width: `${profileCompletion}%`
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetAll}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs hover:bg-white/10"
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <button
              onClick={() => saveProfile()}
              disabled={
                saving ||
                isUploading ||
                !isDirty
              }
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm disabled:opacity-40 hover:bg-cyan-400 transition"
            >
              {saving ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}

              Save
            </button>
          </div>
        </div>
      </header>

      {/* ERROR */}
      {errorMessage && (
        <div className="relative z-40 max-w-[1800px] mx-auto px-4 sm:px-6 pt-4">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-red-300">
              <AlertCircle size={17} />
              <span>{errorMessage}</span>
            </div>

            <button
              onClick={() => setErrorMessage('')}
              className="text-red-300 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {successMessage && (
        <div className="fixed right-5 bottom-5 z-[100]">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 backdrop-blur-xl px-4 py-3 text-sm text-emerald-300 shadow-2xl">
            <CheckCircle2 size={18} />
            {successMessage}
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 py-6">

        <div className="grid grid-cols-1 xl:grid-cols-[250px_minmax(0,1fr)] gap-6">

          {/* SIDEBAR */}
          <aside className="xl:sticky xl:top-24 xl:self-start">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-2">

              {sections.map(section => {
                const Icon = section.icon;

                const active =
                  activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() =>
                      setActiveSection(section.id)
                    }
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition mb-1',
                      active
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    ].join(' ')}
                  >
                    <Icon size={17} />
                    <span>{section.label}</span>
                  </button>
                );
              })}

            </div>

            {/* AUTOSAVE */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    Auto-save
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Save changes automatically
                  </p>
                </div>

                <Toggle
                  checked={autoSave}
                  onChange={setAutoSave}
                />
              </div>
            </div>
          </aside>

          {/* CONTENT */}
          <section className="min-w-0">

            {/* ================================================== */}
            {/* PROFILE */}
            {/* ================================================== */}

            {activeSection === 'profile' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={UserRound}
                  title="Profile Identity"
                  description="Control how people see your identity."
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  <SectionCard title="Identity">

                    <InputField
                      label="Full name"
                      value={formData.full_name}
                      onChange={value =>
                        updateField(
                          'full_name',
                          value
                        )
                      }
                      icon={User}
                    />

                    <InputField
                      label="Nickname / Display name"
                      value={account.nickname}
                      onChange={value =>
                        updateAccount(
                          'nickname',
                          value
                        )
                      }
                      icon={AtSign}
                    />

                    <InputField
                      label="Name pronunciation"
                      value={account.pronunciation}
                      onChange={value =>
                        updateAccount(
                          'pronunciation',
                          value
                        )
                      }
                      placeholder="Example: Mpade — em-PAH-day"
                      icon={Volume2}
                    />

                    <InputField
                      label="Username"
                      value={formData.username}
                      onChange={value => {
                        updateField(
                          'username',
                          value
                        );
                        checkUsername(value);
                      }}
                      icon={AtSign}
                    />

                    {formData.username && (
                      <div className="text-xs mt-1">
                        {usernameState.checking && (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Loader2
                              size={12}
                              className="animate-spin"
                            />
                            Checking...
                          </span>
                        )}

                        {!usernameState.checking &&
                          usernameState.available === true && (
                            <span className="text-emerald-400">
                              ✓ {usernameState.message}
                            </span>
                          )}

                        {!usernameState.checking &&
                          usernameState.available === false && (
                            <span className="text-red-400">
                              ✕ {usernameState.message}
                            </span>
                          )}
                      </div>
                    )}

                    <InputField
                      label="Profile headline"
                      value={account.headline}
                      onChange={value =>
                        updateAccount(
                          'headline',
                          value
                        )
                      }
                      placeholder="Creator • Developer • Artist"
                      icon={Sparkles}
                    />

                    <SelectField
                      label="Pronouns"
                      value={account.pronouns}
                      onChange={value =>
                        updateAccount(
                          'pronouns',
                          value
                        )
                      }
                      options={[
                        ['', 'Prefer not to say'],
                        ['he/him', 'He / Him'],
                        ['she/her', 'She / Her'],
                        ['they/them', 'They / Them'],
                        ['custom', 'Custom']
                      ]}
                    />

                    <SelectField
                      label="Account type"
                      value={account.accountType}
                      onChange={value =>
                        updateAccount(
                          'accountType',
                          value
                        )
                      }
                      options={[
                        ['personal', 'Personal'],
                        ['creator', 'Creator'],
                        ['business', 'Business'],
                        ['organization', 'Organization'],
                        ['professional', 'Professional']
                      ]}
                    />

                    <SelectField
                      label="Profile category"
                      value={account.profileCategory}
                      onChange={value =>
                        updateAccount(
                          'profileCategory',
                          value
                        )
                      }
                      options={[
                        ['', 'Select category'],
                        ['creator', 'Content Creator'],
                        ['artist', 'Artist'],
                        ['musician', 'Musician'],
                        ['developer', 'Developer'],
                        ['business', 'Business'],
                        ['education', 'Education'],
                        ['sports', 'Sports'],
                        ['fashion', 'Fashion'],
                        ['entertainment', 'Entertainment'],
                        ['organization', 'Organization']
                      ]}
                    />

                    <TextAreaField
                      label="Bio"
                      value={formData.bio}
                      onChange={value =>
                        updateField(
                          'bio',
                          value
                        )
                      }
                    />

                    <TextAreaField
                      label="Status message"
                      value={formData.status_message}
                      onChange={value =>
                        updateField(
                          'status_message',
                          value
                        )
                      }
                      placeholder="What are you doing?"
                    />

                  </SectionCard>

                  <SectionCard title="Profile Visibility">

                    <SelectField
                      label="Profile visibility"
                      value={
                        formData.is_private
                          ? 'private'
                          : 'public'
                      }
                      onChange={value =>
                        updateField(
                          'is_private',
                          value === 'private'
                        )
                      }
                      options={[
                        ['public', 'Public'],
                        ['private', 'Private']
                      ]}
                    />

                    <SelectField
                      label="Name visibility"
                      value={account.nameVisibility}
                      onChange={value =>
                        updateAccount(
                          'nameVisibility',
                          value
                        )
                      }
                      options={[
                        ['public', 'Everyone'],
                        ['followers', 'Followers'],
                        ['private', 'Only me']
                      ]}
                    />

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                          {formData.is_private ? (
                            <Lock
                              size={19}
                              className="text-cyan-400"
                            />
                          ) : (
                            <Globe
                              size={19}
                              className="text-cyan-400"
                            />
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-sm">
                            {formData.is_private
                              ? 'Private profile'
                              : 'Public profile'}
                          </p>

                          <p className="text-xs text-slate-500">
                            {formData.is_private
                              ? 'Only approved followers can see restricted content.'
                              : 'Your profile can be discovered publicly.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold">
                          Profile completion
                        </span>

                        <span className="text-cyan-300 font-bold">
                          {profileCompletion}%
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"
                          style={{
                            width: `${profileCompletion}%`
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setPreviewMode('desktop');
                        setPreviewPublic(true);
                        setShowPreview(true);
                      }}
                      className="w-full rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Eye size={17} />
                      Preview as another user
                    </button>

                  </SectionCard>

                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* MEDIA */}
            {/* ================================================== */}

            {activeSection === 'media' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Film}
                  title="Profile Media"
                  description="Manage your avatar, cover, background video, music and profile background."
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  <SectionCard title="Avatar">

                    <MediaUploadBox
                      title="Profile photo"
                      subtitle="PNG, JPG or WEBP"
                      url={formData.avatar_url}
                      loading={uploadingAvatar}
                      onUpload={() =>
                        avatarInputRef.current?.click()
                      }
                      onRemove={() =>
                        removeMedia('avatar')
                      }
                      image
                    />

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleAvatarUpload}
                    />

                    <SelectField
                      label="Avatar shape"
                      value={appearance.avatarShape}
                      onChange={value =>
                        updateAppearance(
                          'avatarShape',
                          value
                        )
                      }
                      options={[
                        ['circle', 'Circle'],
                        ['square', 'Square'],
                        ['rounded', 'Rounded'],
                        ['hexagon', 'Hexagon']
                      ]}
                    />

                  </SectionCard>

                  <SectionCard title="Cover">

                    <MediaUploadBox
                      title="Cover photo"
                      subtitle="Wide image recommended"
                      url={formData.cover_url}
                      loading={uploadingCover}
                      onUpload={() =>
                        coverInputRef.current?.click()
                      }
                      onRemove={() =>
                        removeMedia('cover')
                      }
                      image
                    />

                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleCoverUpload}
                    />

                    <SelectField
                      label="Cover position"
                      value={mediaSettings.coverPosition}
                      onChange={value =>
                        updateMedia(
                          'coverPosition',
                          value
                        )
                      }
                      options={[
                        ['top', 'Top'],
                        ['center', 'Center'],
                        ['bottom', 'Bottom'],
                        ['left', 'Left'],
                        ['right', 'Right']
                      ]}
                    />

                    <SelectField
                      label="Cover style"
                      value={appearance.coverStyle}
                      onChange={value =>
                        updateAppearance(
                          'coverStyle',
                          value
                        )
                      }
                      options={[
                        ['cinematic', 'Cinematic'],
                        ['classic', 'Classic'],
                        ['minimal', 'Minimal'],
                        ['glass', 'Glass']
                      ]}
                    />

                  </SectionCard>

                  <SectionCard title="Profile Video">

                    <MediaUploadBox
                      title="Upload profile video"
                      subtitle="MP4/WebM recommended"
                      url={formData.profile_video_url}
                      loading={uploadingVideo}
                      onUpload={() =>
                        videoInputRef.current?.click()
                      }
                      onRemove={() =>
                        removeMedia('video')
                      }
                      video
                    />

                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={handleVideoUpload}
                    />

                    <ToggleRow
                      label="Enable background video"
                      checked={mediaSettings.videoEnabled}
                      onChange={value =>
                        updateMedia(
                          'videoEnabled',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Autoplay"
                      checked={mediaSettings.videoAutoplay}
                      onChange={value =>
                        updateMedia(
                          'videoAutoplay',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Loop video"
                      checked={mediaSettings.videoLoop}
                      onChange={value =>
                        updateMedia(
                          'videoLoop',
                          value
                        )
                      }
                    />

                    <InputField
                      label="Video thumbnail / cover"
                      value={mediaSettings.videoThumbnail}
                      onChange={value =>
                        updateMedia(
                          'videoThumbnail',
                          value
                        )
                      }
                    />

                  </SectionCard>

                  <SectionCard title="Profile Music">

                    <MediaUploadBox
                      title="Upload profile music"
                      subtitle="MP3, WAV, OGG"
                      url={formData.profile_music_url}
                      loading={uploadingMusic}
                      onUpload={() =>
                        musicInputRef.current?.click()
                      }
                      onRemove={() =>
                        removeMedia('music')
                      }
                      audio
                    />

                    <input
                      ref={musicInputRef}
                      type="file"
                      accept="audio/*"
                      hidden
                      onChange={handleMusicUpload}
                    />

                    <ToggleRow
                      label="Autoplay music"
                      checked={mediaSettings.musicAutoplay}
                      onChange={value =>
                        updateMedia(
                          'musicAutoplay',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Loop music"
                      checked={mediaSettings.musicLoop}
                      onChange={value =>
                        updateMedia(
                          'musicLoop',
                          value
                        )
                      }
                    />

                  </SectionCard>

                  <SectionCard title="Profile Background">

                    <MediaUploadBox
                      title="Background image"
                      subtitle="Custom profile background"
                      url={appearance.backgroundImage}
                      loading={uploadingBackground}
                      onUpload={() =>
                        backgroundInputRef.current?.click()
                      }
                      onRemove={() =>
                        removeMedia('background')
                      }
                      image
                    />

                    <input
                      ref={backgroundInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleBackgroundUpload}
                    />

                    <ToggleRow
                      label="Background animation"
                      checked={
                        appearance.backgroundAnimation
                      }
                      onChange={value =>
                        updateAppearance(
                          'backgroundAnimation',
                          value
                        )
                      }
                    />

                    <SelectField
                      label="Media privacy"
                      value={mediaSettings.mediaVisibility}
                      onChange={value =>
                        updateMedia(
                          'mediaVisibility',
                          value
                        )
                      }
                      options={[
                        ['public', 'Everyone'],
                        ['followers', 'Followers'],
                        ['private', 'Only me']
                      ]}
                    />

                  </SectionCard>

                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* SOCIAL */}
            {/* ================================================== */}

            {activeSection === 'social' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Share2}
                  title="Social Links"
                  description="Connect your other platforms."
                />

                <SectionCard title="Connected Platforms">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {SOCIAL_PLATFORMS.map(platform => (
                      <div
                        key={platform}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <InputField
                          label={
                            platform === 'twitter'
                              ? 'X / Twitter'
                              : platform.charAt(0).toUpperCase() +
                                platform.slice(1)
                          }
                          value={
                            socials[platform] || ''
                          }
                          onChange={value =>
                            updateSocial(
                              platform,
                              value
                            )
                          }
                          icon={Link2}
                        />

                        <div className="mt-2">
                          <SelectField
                            label="Visibility"
                            value={
                              socials[
                                `${platform}_visibility`
                              ] || 'public'
                            }
                            onChange={value =>
                              updateSocial(
                                `${platform}_visibility`,
                                value
                              )
                            }
                            options={[
                              ['public', 'Everyone'],
                              ['followers', 'Followers'],
                              ['private', 'Only me']
                            ]}
                          />
                        </div>
                      </div>
                    ))}

                  </div>

                </SectionCard>

                <SectionCard title="Custom Social Links">

                  {socials.custom.map(
                    (item, index) => (
                      <div
                        key={item.id || index}
                        className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 mb-3"
                      >
                        <InputField
                          label="Platform"
                          value={item.name || ''}
                          onChange={value => {
                            const next = [
                              ...socials.custom
                            ];

                            next[index] = {
                              ...next[index],
                              name: value
                            };

                            updateSocial(
                              'custom',
                              next
                            );
                          }}
                        />

                        <InputField
                          label="URL"
                          value={item.url || ''}
                          onChange={value => {
                            const next = [
                              ...socials.custom
                            ];

                            next[index] = {
                              ...next[index],
                              url: value
                            };

                            updateSocial(
                              'custom',
                              next
                            );
                          }}
                        />

                        <button
                          onClick={() => {
                            updateSocial(
                              'custom',
                              socials.custom.filter(
                                (_, i) =>
                                  i !== index
                              )
                            );
                          }}
                          className="h-11 mt-6 px-3 rounded-xl border border-red-400/20 bg-red-500/10 text-red-300"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    )
                  )}

                  <button
                    onClick={() =>
                      updateSocial(
                        'custom',
                        [
                          ...socials.custom,
                          {
                            id: Date.now(),
                            name: '',
                            url: ''
                          }
                        ]
                      )
                    }
                    className="px-4 py-2.5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 text-sm flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add custom link
                  </button>

                </SectionCard>

              </div>
            )}

            {/* ================================================== */}
            {/* PERSONAL */}
            {/* ================================================== */}

            {activeSection === 'personal' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Fingerprint}
                  title="Personal Information"
                  description="Manage personal details and their visibility."
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  <SectionCard title="Basic Information">

                    <SelectField
                      label="Gender"
                      value={formData.gender}
                      onChange={value =>
                        updateField(
                          'gender',
                          value
                        )
                      }
                      options={[
                        ['', 'Prefer not to say'],
                        ['male', 'Male'],
                        ['female', 'Female'],
                        ['non_binary', 'Non-binary'],
                        ['other', 'Other']
                      ]}
                    />

                    <DateField
                      label="Date of birth"
                      value={formData.dob}
                      onChange={value =>
                        updateField(
                          'dob',
                          value
                        )
                      }
                    />

                    <SelectField
                      label="Relationship status"
                      value={
                        personal.relationshipStatus
                      }
                      onChange={value =>
                        updatePersonal(
                          'relationshipStatus',
                          value
                        )
                      }
                      options={[
                        ['', 'Prefer not to say'],
                        ['single', 'Single'],
                        ['relationship', 'In a relationship'],
                        ['married', 'Married'],
                        ['engaged', 'Engaged'],
                        ['complicated', 'It is complicated']
                      ]}
                    />

                    <InputField
                      label="Occupation"
                      value={
                        personal.occupation
                      }
                      onChange={value =>
                        updatePersonal(
                          'occupation',
                          value
                        )
                      }
                      icon={Briefcase}
                    />

                    <InputField
                      label="Education"
                      value={
                        personal.education
                      }
                      onChange={value =>
                        updatePersonal(
                          'education',
                          value
                        )
                      }
                      icon={GraduationCap}
                    />

                    <InputField
                      label="School / University"
                      value={
                        personal.school
                      }
                      onChange={value =>
                        updatePersonal(
                          'school',
                          value
                        )
                      }
                      icon={GraduationCap}
                    />

                    <TextAreaField
                      label="Skills"
                      value={
                        personal.skills
                      }
                      onChange={value =>
                        updatePersonal(
                          'skills',
                          value
                        )
                      }
                      placeholder="Programming, design, photography..."
                    />

                    <TextAreaField
                      label="Languages"
                      value={
                        personal.languages
                      }
                      onChange={value =>
                        updatePersonal(
                          'languages',
                          value
                        )
                      }
                      placeholder="English, Chichewa..."
                    />

                  </SectionCard>

                  <SectionCard title="Personal Privacy">

                    <SelectField
                      label="Birthday visibility"
                      value={
                        visibility.birthday
                      }
                      onChange={value =>
                        updateVisibility(
                          'birthday',
                          value
                        )
                      }
                      options={[
                        ['public', 'Everyone'],
                        ['followers', 'Followers'],
                        ['private', 'Only me']
                      ]}
                    />

                    <SelectField
                      label="Gender visibility"
                      value={
                        visibility.gender
                      }
                      onChange={value =>
                        updateVisibility(
                          'gender',
                          value
                        )
                      }
                      options={[
                        ['public', 'Everyone'],
                        ['followers', 'Followers'],
                        ['private', 'Only me']
                      ]}
                    />

                    <SelectField
                      label="Phone visibility"
                      value={
                        visibility.phone
                      }
                      onChange={value =>
                        updateVisibility(
                          'phone',
                          value
                        )
                      }
                      options={[
                        ['public', 'Everyone'],
                        ['followers', 'Followers'],
                        ['private', 'Only me']
                      ]}
                    />

                    <InputField
                      label="Phone number"
                      value={
                        formData.phone_number
                      }
                      onChange={value =>
                        updateField(
                          'phone_number',
                          value
                        )
                      }
                      icon={Smartphone}
                    />

                  </SectionCard>

                  <SectionCard title="Location">

                    <SelectField
                      label="Country"
                      value={
                        locationSettings.country
                      }
                      onChange={value =>
                        updateLocation(
                          'country',
                          value
                        )
                      }
                      options={[
                        ['Malawi', 'Malawi'],
                        ['Zambia', 'Zambia'],
                        ['Tanzania', 'Tanzania'],
                        ['Mozambique', 'Mozambique'],
                        ['Zimbabwe', 'Zimbabwe'],
                        ['South Africa', 'South Africa']
                      ]}
                    />

                    <SelectField
                      label="Region"
                      value={
                        locationSettings.region
                      }
                      onChange={value =>
                        updateLocation(
                          'region',
                          value
                        )
                      }
                      options={[
                        ['Northern Region', 'Northern Region'],
                        ['Central Region', 'Central Region'],
                        ['Southern Region', 'Southern Region']
                      ]}
                    />

                    <InputField
                      label="City"
                      value={
                        locationSettings.city
                      }
                      onChange={value =>
                        updateLocation(
                          'city',
                          value
                        )
                      }
                      icon={MapPin}
                    />

                    <SelectField
                      label="Home district"
                      value={
                        formData.district
                      }
                      onChange={value =>
                        updateField(
                          'district',
                          value
                        )
                      }
                      options={
                        DISTRICTS.map(
                          district => [
                            district,
                            district
                          ]
                        )
                      }
                    />

                    <InputField
                      label="Specific location"
                      value={
                        formData.location
                      }
                      onChange={value =>
                        updateField(
                          'location',
                          value
                        )
                      }
                      icon={Map}
                    />

                    <SelectField
                      label="Location visibility"
                      value={
                        locationSettings.visibility
                      }
                      onChange={value =>
                        updateLocation(
                          'visibility',
                          value
                        )
                      }
                      options={[
                        ['public', 'Everyone'],
                        ['followers', 'Followers'],
                        ['private', 'Only me']
                      ]}
                    />

                    <ToggleRow
                      label="Hide exact location"
                      checked={
                        locationSettings.hideExactLocation
                      }
                      onChange={value =>
                        updateLocation(
                          'hideExactLocation',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="GPS location sharing"
                      checked={
                        locationSettings.gpsSharing
                      }
                      onChange={value =>
                        updateLocation(
                          'gpsSharing',
                          value
                        )
                      }
                    />

                  </SectionCard>

                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* INTERESTS */}
            {/* ================================================== */}

            {activeSection === 'interests' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Heart}
                  title="Interests"
                  description="Choose interests that personalize your profile and discovery."
                />

                <SectionCard title="Selected Interests">

                  <div className="flex flex-wrap gap-2 mb-5">

                    {formData.interests.map(
                      interest => (
                        <button
                          key={interest}
                          onClick={() =>
                            removeInterest(
                              interest
                            )
                          }
                          className="px-3 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs flex items-center gap-2"
                        >
                          {interest}
                          <X size={13} />
                        </button>
                      )
                    )}

                    {!formData.interests.length && (
                      <p className="text-sm text-slate-500">
                        No interests selected.
                      </p>
                    )}

                  </div>

                  <div className="relative mb-4">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      value={interestSearch}
                      onChange={event =>
                        setInterestSearch(
                          event.target.value
                        )
                      }
                      placeholder="Search interests..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-cyan-400/40"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">

                    {filteredInterests.map(
                      interest => {
                        const selected =
                          formData.interests.includes(
                            interest
                          );

                        return (
                          <button
                            key={interest}
                            onClick={() =>
                              toggleInterest(
                                interest
                              )
                            }
                            className={[
                              'px-3 py-2 rounded-full border text-xs transition',
                              selected
                                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            ].join(' ')}
                          >
                            {selected && '✓ '}
                            {interest}
                          </button>
                        );
                      }
                    )}

                  </div>

                </SectionCard>

                <SectionCard title="Custom Interests">

                  <div className="flex gap-2">
                    <input
                      value={customInterest}
                      onChange={event =>
                        setCustomInterest(
                          event.target.value
                        )
                      }
                      onKeyDown={event => {
                        if (
                          event.key === 'Enter'
                        ) {
                          event.preventDefault();
                          addCustomInterest();
                        }
                      }}
                      placeholder="Add custom interest..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-400/40"
                    />

                    <button
                      onClick={
                        addCustomInterest
                      }
                      className="px-4 rounded-xl bg-cyan-500 text-slate-950"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="mt-4">
                    <ToggleRow
                      label="Use interests for discovery"
                      checked={
                        interestSettings.discovery
                      }
                      onChange={value =>
                        setInterestSettings(
                          prev => ({
                            ...prev,
                            discovery: value
                          })
                        )
                      }
                    />
                  </div>

                </SectionCard>

              </div>
            )}

            {/* ================================================== */}
            {/* PRIVACY */}
            {/* ================================================== */}

            {activeSection === 'privacy' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Shield}
                  title="Privacy"
                  description="Control who can interact with and see your activity."
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  <SectionCard title="Interaction">

                    <PrivacySelect
                      label="Who can follow me"
                      value={privacy.whoCanFollow}
                      onChange={value =>
                        updatePrivacy(
                          'whoCanFollow',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Who can message me"
                      value={privacy.whoCanMessage}
                      onChange={value =>
                        updatePrivacy(
                          'whoCanMessage',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Who can comment"
                      value={privacy.whoCanComment}
                      onChange={value =>
                        updatePrivacy(
                          'whoCanComment',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Who can mention me"
                      value={privacy.whoCanMention}
                      onChange={value =>
                        updatePrivacy(
                          'whoCanMention',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Who can tag me"
                      value={privacy.whoCanTag}
                      onChange={value =>
                        updatePrivacy(
                          'whoCanTag',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Who can repost"
                      value={privacy.whoCanRepost}
                      onChange={value =>
                        updatePrivacy(
                          'whoCanRepost',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Who can download videos"
                      value={
                        privacy.whoCanDownloadVideos
                      }
                      onChange={value =>
                        updatePrivacy(
                          'whoCanDownloadVideos',
                          value
                        )
                      }
                    />

                  </SectionCard>

                  <SectionCard title="Activity Privacy">

                    <PrivacySelect
                      label="Liked videos"
                      value={
                        visibility.likedVideos
                      }
                      onChange={value =>
                        updateVisibility(
                          'likedVideos',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Saved videos"
                      value={
                        visibility.savedVideos
                      }
                      onChange={value =>
                        updateVisibility(
                          'savedVideos',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Followers"
                      value={
                        visibility.followers
                      }
                      onChange={value =>
                        updateVisibility(
                          'followers',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Following"
                      value={
                        visibility.following
                      }
                      onChange={value =>
                        updateVisibility(
                          'following',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Online status"
                      value={
                        visibility.onlineStatus
                      }
                      onChange={value =>
                        updateVisibility(
                          'onlineStatus',
                          value
                        )
                      }
                    />

                    <PrivacySelect
                      label="Last seen"
                      value={
                        visibility.lastSeen
                      }
                      onChange={value =>
                        updateVisibility(
                          'lastSeen',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Read receipts"
                      checked={
                        privacy.readReceipts
                      }
                      onChange={value =>
                        updatePrivacy(
                          'readReceipts',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Activity status"
                      checked={
                        privacy.showActivity
                      }
                      onChange={value =>
                        updatePrivacy(
                          'showActivity',
                          value
                        )
                      }
                    />

                  </SectionCard>

                  <SectionCard title="Moderation Controls">

                    <ToggleRow
                      label="Approve tags manually"
                      checked={
                        privacy.tagApproval
                      }
                      onChange={value =>
                        updatePrivacy(
                          'tagApproval',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Allow follow requests"
                      checked={
                        privacy.followRequests
                      }
                      onChange={value =>
                        updatePrivacy(
                          'followRequests',
                          value
                        )
                      }
                    />

                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10">
                      <span className="flex items-center gap-2">
                        <UserX size={17} />
                        Blocked users
                      </span>
                      <ChevronDown size={16} />
                    </button>

                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10">
                      <span className="flex items-center gap-2">
                        <EyeOff size={17} />
                        Muted users
                      </span>
                      <ChevronDown size={16} />
                    </button>

                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10">
                      <span className="flex items-center gap-2">
                        <MessageCircle size={17} />
                        Hidden words
                      </span>
                      <ChevronDown size={16} />
                    </button>

                  </SectionCard>

                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* APPEARANCE */}
            {/* ================================================== */}

            {activeSection === 'appearance' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Palette}
                  title="Appearance"
                  description="Customize the visual identity of your profile."
                />

                <SectionCard title="Theme">

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                    {[
                      ['neon', 'Neon Matrix'],
                      ['minimal', 'Minimal Plane'],
                      ['dark', 'Dark Space'],
                      ['glass', 'Glass Future'],
                      ['sunset', 'Sunset'],
                      ['cyber', 'Cyber Grid']
                    ].map(
                      ([value, label]) => (
                        <button
                          key={value}
                          onClick={() => {
                            updateAppearance(
                              'theme',
                              value
                            );
                            updateField(
                              'theme_preference',
                              value
                            );
                          }}
                          className={[
                            'rounded-xl border p-4 text-left transition',
                            appearance.theme === value
                              ? 'border-cyan-400/40 bg-cyan-500/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          ].join(' ')}
                        >
                          <div className="w-full h-12 rounded-lg bg-gradient-to-br from-cyan-500/30 via-fuchsia-500/20 to-blue-500/30 mb-3" />
                          <span className="text-sm">
                            {label}
                          </span>
                        </button>
                      )
                    )}

                  </div>

                </SectionCard>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  <SectionCard title="Visual Settings">

                    <InputField
                      label="Custom background"
                      value={
                        appearance.customBackground
                      }
                      onChange={value =>
                        updateAppearance(
                          'customBackground',
                          value
                        )
                      }
                    />

                    <SelectField
                      label="Font preference"
                      value={appearance.font}
                      onChange={value =>
                        updateAppearance(
                          'font',
                          value
                        )
                      }
                      options={[
                        ['Inter', 'Inter'],
                        ['system', 'System'],
                        ['serif', 'Serif'],
                        ['mono', 'Monospace'],
                        ['display', 'Display']
                      ]}
                    />

                    <SelectField
                      label="Profile card style"
                      value={appearance.cardStyle}
                      onChange={value =>
                        updateAppearance(
                          'cardStyle',
                          value
                        )
                      }
                      options={[
                        ['glass', 'Glass'],
                        ['solid', 'Solid'],
                        ['minimal', 'Minimal'],
                        ['neon', 'Neon'],
                        ['bordered', 'Bordered']
                      ]}
                    />

                    <SelectField
                      label="Profile grid style"
                      value={appearance.gridStyle}
                      onChange={value =>
                        updateAppearance(
                          'gridStyle',
                          value
                        )
                      }
                      options={[
                        ['modern', 'Modern'],
                        ['compact', 'Compact'],
                        ['masonry', 'Masonry'],
                        ['large', 'Large Cards']
                      ]}
                    />

                    <SelectField
                      label="Header style"
                      value={appearance.headerStyle}
                      onChange={value =>
                        updateAppearance(
                          'headerStyle',
                          value
                        )
                      }
                      options={[
                        ['cover', 'Cover'],
                        ['minimal', 'Minimal'],
                        ['centered', 'Centered'],
                        ['cinematic', 'Cinematic']
                      ]}
                    />

                    <SelectField
                      label="Layout"
                      value={formData.layout_style}
                      onChange={value =>
                        updateField(
                          'layout_style',
                          value
                        )
                      }
                      options={[
                        ['grid', 'Grid Showcase Array'],
                        ['feed', 'Vertical Streaming Feed'],
                        ['masonry', 'Masonry Array'],
                        ['hybrid', 'Hybrid Layout']
                      ]}
                    />

                  </SectionCard>

                  <SectionCard title="Effects">

                    <ColorField
                      label="Accent color"
                      value={
                        formData.accent_color
                      }
                      onChange={value =>
                        updateField(
                          'accent_color',
                          value
                        )
                      }
                    />

                    <RangeField
                      label="Neon intensity"
                      value={
                        appearance.neonIntensity
                      }
                      onChange={value =>
                        updateAppearance(
                          'neonIntensity',
                          value
                        )
                      }
                    />

                    <RangeField
                      label="Animation intensity"
                      value={
                        appearance.animationIntensity
                      }
                      onChange={value =>
                        updateAppearance(
                          'animationIntensity',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Reduced motion"
                      checked={
                        appearance.reducedMotion
                      }
                      onChange={value =>
                        updateAppearance(
                          'reducedMotion',
                          value
                        )
                      }
                    />

                  </SectionCard>

                </div>

              </div>
            )}

            {/* ================================================== */}
            {/* CONTENT */}
            {/* ================================================== */}

            {activeSection === 'content' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={LayoutGrid}
                  title="Profile Content"
                  description="Control featured content and how your profile content is presented."
                />

                <SectionCard title="Featured Content">

                  <InputField
                    label="Pinned video ID"
                    value={
                      contentSettings.pinnedVideo
                    }
                    onChange={value =>
                      updateContent(
                        'pinnedVideo',
                        value
                      )
                    }
                  />

                  <InputField
                    label="Featured playlist ID"
                    value={
                      contentSettings.featuredPlaylist
                    }
                    onChange={value =>
                      updateContent(
                        'featuredPlaylist',
                        value
                      )
                    }
                  />

                  <SelectField
                    label="Content ordering"
                    value={
                      contentSettings.contentOrder
                    }
                    onChange={value =>
                      updateContent(
                        'contentOrder',
                        value
                      )
                    }
                    options={[
                      ['latest', 'Latest first'],
                      ['popular', 'Most popular'],
                      ['featured', 'Featured first'],
                      ['custom', 'Custom order']
                    ]}
                  />

                  <ToggleRow
                    label="Show playlists"
                    checked={
                      contentSettings.showPlaylists
                    }
                    onChange={value =>
                      updateContent(
                        'showPlaylists',
                        value
                      )
                    }
                  />

                </SectionCard>

                <SectionCard title="Content Visibility">

                  <PrivacySelect
                    label="Reposts"
                    value={
                      contentSettings.repostsVisibility
                    }
                    onChange={value =>
                      updateContent(
                        'repostsVisibility',
                        value
                      )
                    }
                  />

                  <PrivacySelect
                    label="Liked videos"
                    value={
                      contentSettings.likedVideosVisibility
                    }
                    onChange={value =>
                      updateContent(
                        'likedVideosVisibility',
                        value
                      )
                    }
                  />

                  <PrivacySelect
                    label="Saved content"
                    value={
                      contentSettings.savedContentVisibility
                    }
                    onChange={value =>
                      updateContent(
                        'savedContentVisibility',
                        value
                      )
                    }
                  />

                </SectionCard>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <ActionCard
                    icon={Video}
                    title="Featured videos"
                    description="Choose videos to showcase."
                  />

                  <ActionCard
                    icon={Music}
                    title="Playlists"
                    description="Manage profile playlists."
                  />

                  <ActionCard
                    icon={FileText}
                    title="Drafts"
                    description="Manage unpublished content."
                  />

                </div>

              </div>
            )}

            {/* ================================================== */}
            {/* CREATOR */}
            {/* ================================================== */}

            {activeSection === 'creator' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Crown}
                  title="Creator Features"
                  description="Turn your profile into a professional creator presence."
                />

                <SectionCard title="Creator Mode">

                  <ToggleRow
                    label="Creator mode"
                    checked={
                      creator.creatorMode
                    }
                    onChange={value =>
                      updateCreator(
                        'creatorMode',
                        value
                      )
                    }
                  />

                  <ToggleRow
                    label="Professional profile"
                    checked={
                      creator.professionalProfile
                    }
                    onChange={value =>
                      updateCreator(
                        'professionalProfile',
                        value
                      )
                    }
                  />

                  <SelectField
                    label="Creator category"
                    value={
                      creator.creatorCategory
                    }
                    onChange={value =>
                      updateCreator(
                        'creatorCategory',
                        value
                      )
                    }
                    options={[
                      ['', 'Select category'],
                      ['creator', 'Creator'],
                      ['artist', 'Artist'],
                      ['musician', 'Musician'],
                      ['educator', 'Educator'],
                      ['gamer', 'Gamer'],
                      ['business', 'Business'],
                      ['influencer', 'Influencer']
                    ]}
                  />

                  <InputField
                    label="Business contact"
                    value={
                      creator.businessContact
                    }
                    onChange={value =>
                      updateCreator(
                        'businessContact',
                        value
                      )
                    }
                  />

                  <ToggleRow
                    label="Creator analytics"
                    checked={
                      creator.analyticsEnabled
                    }
                    onChange={value =>
                      updateCreator(
                        'analyticsEnabled',
                        value
                      )
                    }
                  />

                </SectionCard>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  <CreatorFeature
                    icon={BarChart3}
                    title="Analytics"
                    enabled={
                      creator.analyticsEnabled
                    }
                  />

                  <CreatorFeature
                    icon={Gift}
                    title="Gifts"
                    enabled={
                      creator.giftsEnabled
                    }
                    onChange={value =>
                      updateCreator(
                        'giftsEnabled',
                        value
                      )
                    }
                  />

                  <CreatorFeature
                    icon={Crown}
                    title="Subscriptions"
                    enabled={
                      creator.subscriptionsEnabled
                    }
                    onChange={value =>
                      updateCreator(
                        'subscriptionsEnabled',
                        value
                      )
                    }
                  />

                  <CreatorFeature
                    icon={Coins}
                    title="Paid content"
                    enabled={
                      creator.paidContentEnabled
                    }
                    onChange={value =>
                      updateCreator(
                        'paidContentEnabled',
                        value
                      )
                    }
                  />

                  <CreatorFeature
                    icon={Megaphone}
                    title="Content promotion"
                    enabled={
                      creator.promotionEnabled
                    }
                    onChange={value =>
                      updateCreator(
                        'promotionEnabled',
                        value
                      )
                    }
                  />

                  <CreatorFeature
                    icon={Wallet}
                    title="Monetization"
                    enabled={
                      creator.monetizationEnabled
                    }
                    onChange={value =>
                      updateCreator(
                        'monetizationEnabled',
                        value
                      )
                    }
                  />

                </div>

              </div>
            )}

            {/* ================================================== */}
            {/* DISCOVERY */}
            {/* ================================================== */}

            {activeSection === 'discovery' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={SearchCheck}
                  title="Profile Discovery"
                  description="Control how people discover your profile."
                />

                <SectionCard title="Discovery">

                  <ToggleRow
                    label="Search visibility"
                    checked={
                      discovery.searchable
                    }
                    onChange={value =>
                      updateDiscovery(
                        'searchable',
                        value
                      )
                    }
                  />

                  <ToggleRow
                    label="Suggested account visibility"
                    checked={
                      discovery.suggestedAccounts
                    }
                    onChange={value =>
                      updateDiscovery(
                        'suggestedAccounts',
                        value
                      )
                    }
                  />

                  <ToggleRow
                    label="Contact synchronization"
                    checked={
                      discovery.contactSync
                    }
                    onChange={value =>
                      updateDiscovery(
                        'contactSync',
                        value
                      )
                    }
                  />

                  <ToggleRow
                    label="Friend discovery"
                    checked={
                      discovery.friendDiscovery
                    }
                    onChange={value =>
                      updateDiscovery(
                        'friendDiscovery',
                        value
                      )
                    }
                  />

                  <ToggleRow
                    label="Allow profile indexing"
                    checked={
                      discovery.profileIndexing
                    }
                    onChange={value =>
                      updateDiscovery(
                        'profileIndexing',
                        value
                      )
                    }
                  />

                  <ToggleRow
                    label="Search-engine visibility"
                    checked={
                      discovery.searchEngineVisibility
                    }
                    onChange={value =>
                      updateDiscovery(
                        'searchEngineVisibility',
                        value
                      )
                    }
                  />

                  <ToggleRow
                    label="Allow profile sharing"
                    checked={
                      discovery.allowProfileSharing
                    }
                    onChange={value =>
                      updateDiscovery(
                        'allowProfileSharing',
                        value
                      )
                    }
                  />

                </SectionCard>

                <SectionCard title="Profile Sharing">

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <Link2
                          size={18}
                          className="text-cyan-400"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Profile link
                        </p>

                        <p className="text-xs text-slate-500 truncate">
                          {profileUrl}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={
                          copyProfileLink
                        }
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm flex items-center justify-center gap-2"
                      >
                        <Copy size={16} />
                        Copy
                      </button>

                      <button
                        onClick={
                          shareProfile
                        }
                        className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <Share2 size={16} />
                        Share
                      </button>

                      <button
                        onClick={() =>
                          setShowQRCode(true)
                        }
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10"
                      >
                        <QrCode size={17} />
                      </button>
                    </div>

                  </div>

                </SectionCard>

              </div>
            )}

            {/* ================================================== */}
            {/* VERIFICATION */}
            {/* ================================================== */}

            {activeSection === 'verification' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={BadgeCheck}
                  title="Verification"
                  description="Manage your verification request and badge information."
                />

                <SectionCard title="Current Status">

                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-5 flex items-center gap-4">

                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                      <BadgeCheck
                        size={28}
                        className="text-cyan-400"
                      />
                    </div>

                    <div>
                      <p className="font-bold">
                        {formData.verified_status === 'none'
                          ? 'Not verified'
                          : formData.verified_status === 'blue'
                            ? 'Blue Verified'
                            : 'Gold Organization'}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        Verification badges are controlled by the platform.
                      </p>
                    </div>

                  </div>

                </SectionCard>

                <SectionCard title="Verification Application">

                  <SelectField
                    label="Verification type"
                    value={verification.type}
                    onChange={value =>
                      setVerification(
                        prev => ({
                          ...prev,
                          type: value
                        })
                      )
                    }
                    options={[
                      ['personal', 'Personal'],
                      ['creator', 'Creator'],
                      ['organization', 'Organization'],
                      ['business', 'Business']
                    ]}
                  />

                  <InputField
                    label="Organization name"
                    value={
                      verification.organizationName
                    }
                    onChange={value =>
                      setVerification(
                        prev => ({
                          ...prev,
                          organizationName:
                            value
                        })
                      )
                    }
                    icon={Building2}
                  />

                  <InputField
                    label="Organization website"
                    value={
                      verification.organizationWebsite
                    }
                    onChange={value =>
                      setVerification(
                        prev => ({
                          ...prev,
                          organizationWebsite:
                            value
                        })
                      )
                    }
                    icon={Globe2}
                  />

                  <TextAreaField
                    label="Verification information"
                    value={
                      verification.information
                    }
                    onChange={value =>
                      setVerification(
                        prev => ({
                          ...prev,
                          information:
                            value
                        })
                      )
                    }
                  />

                  <TextAreaField
                    label="Request message"
                    value={
                      verification.requestMessage
                    }
                    onChange={value =>
                      setVerification(
                        prev => ({
                          ...prev,
                          requestMessage:
                            value
                        })
                      )
                    }
                  />

                  <button
                    onClick={
                      submitVerification
                    }
                    className="px-5 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm flex items-center gap-2"
                  >
                    <BadgeCheck size={17} />
                    Submit verification request
                  </button>

                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-xs text-amber-300">
                    Verification documents should be uploaded through a secure verification workflow, not stored as public profile data.
                  </div>

                </SectionCard>

              </div>
            )}

            {/* ================================================== */}
            {/* FINANCIAL */}
            {/* ================================================== */}

            {activeSection === 'financial' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Wallet}
                  title="Financial & Monetization"
                  description="Manage creator payouts and earnings preferences."
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  <SectionCard title="Payout">

                    <InputField
                      label="Payment phone number"
                      value={
                        formData.phone_number
                      }
                      onChange={value =>
                        updateField(
                          'phone_number',
                          value
                        )
                      }
                      icon={Smartphone}
                    />

                    <SelectField
                      label="Mobile Money"
                      value={
                        formData.payout_method
                      }
                      onChange={value =>
                        updateField(
                          'payout_method',
                          value
                        )
                      }
                      options={[
                        ['Mobile Money', 'Mobile Money'],
                        ['TNM Mobile Money', 'TNM Mobile Money'],
                        ['Airtel Money', 'Airtel Money'],
                        ['Bank Transfer', 'Bank Transfer']
                      ]}
                    />

                    <SelectField
                      label="Currency"
                      value={
                        formData.currency_preference
                      }
                      onChange={value =>
                        updateField(
                          'currency_preference',
                          value
                        )
                      }
                      options={[
                        ['MWK', 'MWK — Malawi Kwacha'],
                        ['USD', 'USD'],
                        ['ZAR', 'ZAR'],
                        ['ZMW', 'ZMW'],
                        ['TZS', 'TZS']
                      ]}
                    />

                    <InputField
                      label="Payout minimum"
                      type="number"
                      value={
                        monetization.payoutMinimum
                      }
                      onChange={value =>
                        setMonetization(
                          prev => ({
                            ...prev,
                            payoutMinimum:
                              Number(value)
                          })
                        )
                      }
                      icon={CircleDollarSign}
                    />

                    <SelectField
                      label="Payout schedule"
                      value={
                        monetization.payoutSchedule
                      }
                      onChange={value =>
                        setMonetization(
                          prev => ({
                            ...prev,
                            payoutSchedule:
                              value
                          })
                        )
                      }
                      options={[
                        ['weekly', 'Weekly'],
                        ['monthly', 'Monthly'],
                        ['threshold', 'When threshold is reached']
                      ]}
                    />

                  </SectionCard>

                  <SectionCard title="Bank Account">

                    <InputField
                      label="Bank name"
                      value={
                        bankDetails.bankName
                      }
                      onChange={value =>
                        setBankDetails(
                          prev => ({
                            ...prev,
                            bankName:
                              value
                          })
                        )
                      }
                    />

                    <InputField
                      label="Account name"
                      value={
                        bankDetails.accountName
                      }
                      onChange={value =>
                        setBankDetails(
                          prev => ({
                            ...prev,
                            accountName:
                              value
                          })
                        )
                      }
                    />

                    <InputField
                      label="Account number"
                      value={
                        bankDetails.accountNumber
                      }
                      onChange={value =>
                        setBankDetails(
                          prev => ({
                            ...prev,
                            accountNumber:
                              value
                          })
                        )
                      }
                    />

                    <InputField
                      label="Branch"
                      value={
                        bankDetails.branch
                      }
                      onChange={value =>
                        setBankDetails(
                          prev => ({
                            ...prev,
                            branch:
                              value
                          })
                        )
                      }
                    />

                  </SectionCard>

                  <SectionCard title="Creator Earnings">

                    <ToggleRow
                      label="Gift earnings"
                      checked={
                        monetization.giftEarnings
                      }
                      onChange={value =>
                        setMonetization(
                          prev => ({
                            ...prev,
                            giftEarnings:
                              value
                          })
                        )
                      }
                    />

                    <ToggleRow
                      label="Coin earnings"
                      checked={
                        monetization.coinEarnings
                      }
                      onChange={value =>
                        setMonetization(
                          prev => ({
                            ...prev,
                            coinEarnings:
                              value
                          })
                        )
                      }
                    />

                    <ToggleRow
                      label="Withdrawals"
                      checked={
                        monetization.withdrawalsEnabled
                      }
                      onChange={value =>
                        setMonetization(
                          prev => ({
                            ...prev,
                            withdrawalsEnabled:
                              value
                          })
                        )
                      }
                    />

                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="flex items-center gap-2">
                        <Coins size={17} />
                        Gift / coin earnings
                      </span>
                      <ExternalLink size={15} />
                    </button>

                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="flex items-center gap-2">
                        <Wallet size={17} />
                        Payout history
                      </span>
                      <ExternalLink size={15} />
                    </button>

                  </SectionCard>

                  <SectionCard title="Tax & Payment">

                    <TextAreaField
                      label="Tax information"
                      value={
                        monetization.taxInformation
                      }
                      onChange={value =>
                        setMonetization(
                          prev => ({
                            ...prev,
                            taxInformation:
                              value
                          })
                        )
                      }
                    />

                    <ToggleRow
                      label="Payment verified"
                      checked={
                        monetization.paymentVerified
                      }
                      onChange={() => {}}
                      disabled
                    />

                  </SectionCard>

                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* SECURITY */}
            {/* ================================================== */}

            {activeSection === 'security' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Lock}
                  title="Security"
                  description="Protect your account and manage authentication."
                />

                <SectionCard title="Two-Factor Authentication">

                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-white/5">

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <SmartphoneNfc
                          size={18}
                          className="text-cyan-400"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold">
                          Authenticator app
                        </p>

                        <p className="text-xs text-slate-500">
                          {security.twoFactorEnabled
                            ? 'Enabled'
                            : 'Not enabled'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={
                        enableTwoFactor
                      }
                      className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold"
                    >
                      {security.twoFactorEnabled
                        ? 'Manage'
                        : 'Enable'}
                    </button>

                  </div>

                </SectionCard>

                <SectionCard title="Login Security">

                  <ToggleRow
                    label="Login alerts"
                    checked={
                      security.loginAlerts
                    }
                    onChange={value =>
                      setSecurity(
                        prev => ({
                          ...prev,
                          loginAlerts:
                            value
                        })
                      )
                    }
                  />

                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/5">
                    <span className="flex items-center gap-2">
                      <Smartphone size={17} />
                      Active devices
                    </span>
                    <ChevronDown size={16} />
                  </button>

                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/5">
                    <span className="flex items-center gap-2">
                      <FingerprintIcon size={17} />
                      Passkeys
                    </span>
                    <ChevronDown size={16} />
                  </button>

                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/5">
                    <span className="flex items-center gap-2">
                      <Database size={17} />
                      Security activity
                    </span>
                    <ChevronDown size={16} />
                  </button>

                </SectionCard>

                <SectionCard title="Sessions">

                  <p className="text-xs text-slate-500 mb-4">
                    This will sign you out from every active session.
                  </p>

                  <button
                    onClick={
                      logoutAllDevices
                    }
                    className="px-4 py-3 rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 text-sm flex items-center gap-2"
                  >
                    <LogOut size={17} />
                    Logout all devices
                  </button>

                </SectionCard>

              </div>
            )}

            {/* ================================================== */}
            {/* ACCOUNT */}
            {/* ================================================== */}

            {activeSection === 'account' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Settings2}
                  title="Account Management"
                  description="Manage account credentials and account lifecycle."
                />

                <SectionCard title="Email">

                  <InputField
                    label="Current email"
                    value={
                      accountSecurity.email
                    }
                    disabled
                  />

                  <InputField
                    label="New email"
                    value={
                      accountSecurity.newEmail
                    }
                    onChange={value =>
                      setAccountSecurity(
                        prev => ({
                          ...prev,
                          newEmail:
                            value
                        })
                      )
                    }
                  />

                  <button
                    onClick={
                      changeEmail
                    }
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold"
                  >
                    Change email
                  </button>

                </SectionCard>

                <SectionCard title="Password">

                  <InputField
                    label="New password"
                    type="password"
                    value={
                      accountSecurity.newPassword
                    }
                    onChange={value =>
                      setAccountSecurity(
                        prev => ({
                          ...prev,
                          newPassword:
                            value
                        })
                      )
                    }
                  />

                  <InputField
                    label="Confirm password"
                    type="password"
                    value={
                      accountSecurity.confirmPassword
                    }
                    onChange={value =>
                      setAccountSecurity(
                        prev => ({
                          ...prev,
                          confirmPassword:
                            value
                        })
                      )
                    }
                  />

                  <button
                    onClick={
                      changePassword
                    }
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold"
                  >
                    Update password
                  </button>

                </SectionCard>

                <SectionCard title="Username">

                  <InputField
                    label="Username"
                    value={
                      formData.username
                    }
                    onChange={value => {
                      updateField(
                        'username',
                        value
                      );
                      checkUsername(
                        value
                      );
                    }}
                  />

                  <p className="text-xs text-slate-500">
                    Username change cooldowns should also be enforced server-side.
                  </p>

                </SectionCard>

                <SectionCard title="Account Data">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <button className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center gap-2 text-sm">
                      <Download size={17} />
                      Export profile data
                    </button>

                    <button className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center gap-2 text-sm">
                      <Database size={17} />
                      Download account data
                    </button>

                  </div>

                </SectionCard>

                <SectionCard title="Danger Zone">

                  <button className="w-full px-4 py-3 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-300 flex items-center justify-center gap-2 text-sm">
                    <UserX size={17} />
                    Deactivate account
                  </button>

                  <button className="w-full px-4 py-3 rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 flex items-center justify-center gap-2 text-sm">
                    <Trash2 size={17} />
                    Delete account
                  </button>

                </SectionCard>

              </div>
            )}

            {/* ================================================== */}
            {/* PREVIEW */}
            {/* ================================================== */}

            {activeSection === 'preview' && (
              <div className="space-y-6">

                <SectionHeader
                  icon={Eye}
                  title="Profile Preview"
                  description="Preview your profile before publishing changes."
                />

                <div className="flex flex-wrap gap-2">

                  <button
                    onClick={() =>
                      setPreviewMode('desktop')
                    }
                    className={[
                      'px-4 py-2 rounded-xl text-sm flex items-center gap-2 border',
                      previewMode === 'desktop'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-white/5 border-white/10'
                    ].join(' ')}
                  >
                    <Monitor size={16} />
                    Desktop
                  </button>

                  <button
                    onClick={() =>
                      setPreviewMode('mobile')
                    }
                    className={[
                      'px-4 py-2 rounded-xl text-sm flex items-center gap-2 border',
                      previewMode === 'mobile'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-white/5 border-white/10'
                    ].join(' ')}
                  >
                    <MobileIcon size={16} />
                    Mobile
                  </button>

                  <button
                    onClick={() =>
                      setPreviewPublic(
                        !previewPublic
                      )
                    }
                    className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm flex items-center gap-2"
                  >
                    {previewPublic ? (
                      <Globe size={16} />
                    ) : (
                      <Users size={16} />
                    )}

                    {previewPublic
                      ? 'Public'
                      : 'Visitor'}
                  </button>

                </div>

                <ProfilePreview
                  formData={formData}
                  account={account}
                  appearance={appearance}
                  previewMode={previewMode}
                  previewPublic={
                    previewPublic
                  }
                  mediaSettings={
                    mediaSettings
                  }
                  onShare={
                    shareProfile
                  }
                />

              </div>
            )}

            {/* SAVE FOOTER */}

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">

              <div>
                <p className="text-sm font-semibold">
                  {isDirty
                    ? 'You have unsaved changes'
                    : 'Everything is saved'}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {lastSaved
                    ? `Last saved ${lastSaved.toLocaleString()}`
                    : 'Save your profile to apply changes.'}
                </p>
              </div>

              <div className="flex items-center gap-2">

                <button
                  onClick={resetAll}
                  disabled={!isDirty}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm disabled:opacity-30"
                >
                  Discard
                </button>

                <button
                  onClick={() =>
                    saveProfile()
                  }
                  disabled={
                    saving ||
                    isUploading ||
                    !isDirty
                  }
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm flex items-center gap-2 disabled:opacity-30"
                >
                  {saving ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  Save Changes
                </button>

              </div>

            </div>

          </section>

        </div>
      </main>

      {/* ====================================================== */}
      {/* PROFILE PREVIEW MODAL */}
      {/* ====================================================== */}

      {showPreview && (
        <Modal
          title="Profile Preview"
          onClose={() =>
            setShowPreview(false)
          }
        >
          <ProfilePreview
            formData={formData}
            account={account}
            appearance={appearance}
            previewMode={previewMode}
            previewPublic={
              previewPublic
            }
            mediaSettings={
              mediaSettings
            }
            onShare={
              shareProfile
            }
          />
        </Modal>
      )}

      {/* ====================================================== */}
      {/* QR MODAL */}
      {/* ====================================================== */}

      {showQRCode && (
        <Modal
          title="Profile QR Code"
          onClose={() =>
            setShowQRCode(false)
          }
        >
          <div className="flex flex-col items-center py-6">

            <div className="w-52 h-52 rounded-2xl bg-white flex items-center justify-center">
              <div className="grid grid-cols-9 gap-1 p-4">

                {Array.from({
                  length: 81
                }).map((_, index) => (
                  <div
                    key={index}
                    className={[
                      'w-3 h-3',
                      (
                        index * 17 +
                        index * 3
                      ) % 5 < 2
                        ? 'bg-black'
                        : 'bg-white'
                    ].join(' ')}
                  />
                ))}

              </div>
            </div>

            <p className="text-sm font-semibold mt-5">
              @{formData.username}
            </p>

            <p className="text-xs text-slate-500 mt-1 text-center">
              Share this profile using your QR code.
            </p>

            <button
              onClick={
                copyProfileLink
              }
              className="mt-5 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-sm flex items-center gap-2"
            >
              <Copy size={16} />
              Copy profile link
            </button>

          </div>
        </Modal>
      )}

    </div>
  );
};


// ============================================================
// REUSABLE COMPONENTS
// ============================================================

const SectionHeader = ({
  icon: Icon,
  title,
  description
}) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-400/10 flex items-center justify-center">
        <Icon
          size={20}
          className="text-cyan-400"
        />
      </div>

      <div>
        <h2 className="text-xl font-bold">
          {title}
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          {description}
        </p>
      </div>
    </div>
  </div>
);


const SectionCard = ({
  title,
  children
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
    <div className="flex items-center justify-between gap-3 mb-5">
      <h3 className="font-semibold">
        {title}
      </h3>
    </div>

    <div className="space-y-4">
      {children}
    </div>
  </div>
);


const InputField = ({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  icon: Icon,
  disabled = false
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-2">
      {label}
    </label>

    <div className="relative">
      {Icon && (
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
      )}

      <input
        type={type}
        value={value ?? ''}
        onChange={event =>
          onChange?.(
            event.target.value
          )
        }
        placeholder={placeholder}
        disabled={disabled}
        className={[
          'w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none transition',
          Icon ? 'pl-10' : '',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'focus:border-cyan-400/40 focus:bg-white/[0.07]'
        ].join(' ')}
      />
    </div>
  </div>
);


const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder = ''
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-2">
      {label}
    </label>

    <textarea
      value={value ?? ''}
      onChange={event =>
        onChange(
          event.target.value
        )
      }
      placeholder={placeholder}
      rows={4}
      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none resize-none focus:border-cyan-400/40 focus:bg-white/[0.07]"
    />
  </div>
);


const SelectField = ({
  label,
  value,
  onChange,
  options
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-2">
      {label}
    </label>

    <div className="relative">
      <select
        value={value ?? ''}
        onChange={event =>
          onChange(
            event.target.value
          )
        }
        className="w-full appearance-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-10 text-sm outline-none focus:border-cyan-400/40"
      >
        {options.map(
          ([optionValue, optionLabel]) => (
            <option
              key={optionValue}
              value={optionValue}
              className="bg-slate-900"
            >
              {optionLabel}
            </option>
          )
        )}
      </select>

      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
      />
    </div>
  </div>
);


const DateField = ({
  label,
  value,
  onChange
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-2">
      {label}
    </label>

    <div className="relative">
      <Calendar
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
      />

      <input
        type="date"
        value={value || ''}
        onChange={event =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pl-10 text-sm outline-none focus:border-cyan-400/40"
      />
    </div>
  </div>
);


const ColorField = ({
  label,
  value,
  onChange
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-2">
      {label}
    </label>

    <div className="flex items-center gap-3">
      <input
        type="color"
        value={
          value || '#06b6d4'
        }
        onChange={event =>
          onChange(
            event.target.value
          )
        }
        className="w-12 h-12 rounded-xl bg-transparent border-0 cursor-pointer"
      />

      <input
        value={value || ''}
        onChange={event =>
          onChange(
            event.target.value
          )
        }
        className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none"
      />
    </div>
  </div>
);


const RangeField = ({
  label,
  value,
  onChange
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs font-medium text-slate-400">
        {label}
      </label>

      <span className="text-xs text-cyan-300">
        {value}%
      </span>
    </div>

    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={event =>
        onChange(
          Number(
            event.target.value
          )
        )
      }
      className="w-full accent-cyan-400"
    />
  </div>
);


const Toggle = ({
  checked,
  onChange,
  disabled = false
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() =>
      !disabled &&
      onChange(!checked)
    }
    className={[
      'w-11 h-6 rounded-full p-1 transition flex items-center',
      checked
        ? 'bg-cyan-500 justify-end'
        : 'bg-white/10 justify-start',
      disabled
        ? 'opacity-40 cursor-not-allowed'
        : ''
    ].join(' ')}
  >
    <span className="w-4 h-4 rounded-full bg-white shadow" />
  </button>
);


const ToggleRow = ({
  label,
  checked,
  onChange,
  disabled = false
}) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span className="text-sm text-slate-300">
      {label}
    </span>

    <Toggle
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
  </div>
);


const PrivacySelect = ({
  label,
  value,
  onChange
}) => (
  <SelectField
    label={label}
    value={value}
    onChange={onChange}
    options={[
      ['everyone', 'Everyone'],
      ['followers', 'Followers'],
      ['friends', 'Friends'],
      ['private', 'Only me']
    ]}
  />
);


const MediaUploadBox = ({
  title,
  subtitle,
  url,
  loading,
  onUpload,
  onRemove,
  image,
  video,
  audio
}) => (
  <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] overflow-hidden">

    {url ? (
      <div className="relative">

        {image && (
          <img
            src={url}
            alt={title}
            className="w-full h-44 object-cover"
          />
        )}

        {video && (
          <video
            src={url}
            controls
            className="w-full h-44 object-cover bg-black"
          />
        )}

        {audio && (
          <div className="p-6">
            <audio
              src={url}
              controls
              className="w-full"
            />
          </div>
        )}

        <div className="absolute top-3 right-3 flex gap-2">

          <button
            onClick={onUpload}
            className="w-9 h-9 rounded-xl bg-black/60 backdrop-blur flex items-center justify-center"
          >
            <Camera size={16} />
          </button>

          <button
            onClick={onRemove}
            className="w-9 h-9 rounded-xl bg-red-500/70 backdrop-blur flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>

        </div>

      </div>
    ) : (
      <button
        onClick={onUpload}
        disabled={loading}
        className="w-full min-h-44 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition"
      >
        {loading ? (
          <Loader2
            size={28}
            className="animate-spin text-cyan-400"
          />
        ) : (
          <Upload
            size={28}
            className="text-cyan-400"
          />
        )}

        <div className="text-center">
          <p className="text-sm font-semibold">
            {loading
              ? 'Uploading...'
              : title}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            {subtitle}
          </p>
        </div>
      </button>
    )}

  </div>
);


const ActionCard = ({
  icon: Icon,
  title,
  description
}) => (
  <button className="text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition">
    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
      <Icon
        size={19}
        className="text-cyan-400"
      />
    </div>

    <p className="font-semibold text-sm">
      {title}
    </p>

    <p className="text-xs text-slate-500 mt-1">
      {description}
    </p>
  </button>
);


const CreatorFeature = ({
  icon: Icon,
  title,
  enabled,
  onChange
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

    <div className="flex items-center justify-between gap-3">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <Icon
            size={19}
            className="text-cyan-400"
          />
        </div>

        <div>
          <p className="font-semibold text-sm">
            {title}
          </p>

          <p className="text-xs text-slate-500">
            {enabled
              ? 'Enabled'
              : 'Disabled'}
          </p>
        </div>
      </div>

      {onChange && (
        <Toggle
          checked={enabled}
          onChange={onChange}
        />
      )}

    </div>

  </div>
);


const Modal = ({
  title,
  onClose,
  children
}) => (
  <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">

    <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#07101f] shadow-2xl">

      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#07101f]/95 backdrop-blur">
        <h3 className="font-bold">
          {title}
        </h3>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5">
        {children}
      </div>

    </div>

  </div>
);


const ProfilePreview = ({
  formData,
  account,
  appearance,
  previewMode,
  previewPublic,
  mediaSettings,
  onShare
}) => (
  <div
    className={[
      'mx-auto transition-all duration-300',
      previewMode === 'mobile'
        ? 'max-w-[390px]'
        : 'max-w-5xl'
    ].join(' ')}
  >

    <div
      className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
      style={{
        boxShadow: `0 0 ${
          appearance.neonIntensity / 3
        }px ${formData.accent_color}33`
      }}
    >

      {/* COVER */}

      <div
        className="h-48 sm:h-64 relative bg-cover"
        style={{
          backgroundImage:
            formData.cover_url
              ? `url(${formData.cover_url})`
              : 'linear-gradient(135deg, rgba(6,182,212,.25), rgba(217,70,239,.2))',
          backgroundPosition:
            mediaSettings.coverPosition ||
            'center'
        }}
      >

        {mediaSettings.videoEnabled &&
          formData.profile_video_url && (
            <video
              src={
                formData.profile_video_url
              }
              autoPlay={
                mediaSettings.videoAutoplay
              }
              loop={
                mediaSettings.videoLoop
              }
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

      </div>

      {/* PROFILE */}

      <div className="px-5 sm:px-8 pb-7">

        <div className="relative -mt-16 flex items-end justify-between gap-4">

          <div
            className={[
              'w-28 h-28 overflow-hidden border-4 border-slate-950 bg-slate-900',
              appearance.avatarShape === 'circle'
                ? 'rounded-full'
                : appearance.avatarShape === 'square'
                  ? 'rounded-none'
                  : 'rounded-3xl'
            ].join(' ')}
          >
            {formData.avatar_url ? (
              <img
                src={
                  formData.avatar_url
                }
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cyan-400">
                <UserRound size={36} />
              </div>
            )}
          </div>

          <button
            onClick={onShare}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-sm flex items-center gap-2"
          >
            <Share2 size={16} />
            Share
          </button>

        </div>

        <div className="mt-4">

          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">
              {account.nickname ||
                formData.full_name ||
                'Your Name'}
            </h2>

            {formData.verified_status !==
              'none' && (
              <BadgeCheck
                size={20}
                className="text-cyan-400"
              />
            )}
          </div>

          <p className="text-sm text-slate-500 mt-1">
            @{formData.username ||
              'username'}
          </p>

          {account.headline && (
            <p className="text-sm text-cyan-300 mt-3">
              {account.headline}
            </p>
          )}

          {formData.bio && (
            <p className="text-sm text-slate-300 mt-3 max-w-2xl">
              {formData.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">

            {formData.district && (
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs flex items-center gap-1.5">
                <MapPin size={13} />
                {formData.district}
              </span>
            )}

            {formData.is_private && (
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs flex items-center gap-1.5">
                <Lock size={13} />
                Private
              </span>
            )}

            {previewPublic && (
              <span className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/10 text-cyan-300 text-xs">
                Public preview
              </span>
            )}

          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {formData.interests
              .slice(0, 8)
              .map(interest => (
                <span
                  key={interest}
                  className="px-3 py-1.5 rounded-full bg-cyan-500/5 border border-cyan-400/10 text-xs text-cyan-300"
                >
                  #{interest}
                </span>
              ))}
          </div>

        </div>

      </div>

    </div>

  </div>
);


// ============================================================
// EXPORT
// ============================================================

export default EditProfile;
