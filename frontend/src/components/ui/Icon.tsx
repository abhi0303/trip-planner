import {
  Anchor, Armchair, ArrowLeft, ArrowRight, ArrowUpRight, ArrowUpDown, Backpack,
  BadgeCheck, Banknote, Bed, Binoculars, Bird, BookMarked, Bookmark, Building2,
  Bus, CalendarDays, Camera, Car, Castle, Check, ChevronDown, ChevronLeft,
  ChevronRight, ChevronUp, Church, Clock3, Cloud, CloudFog, CloudRain, CloudSun,
  Coffee, Coins, Compass, CreditCard, Crown, Droplets, Eye, EyeOff, Flame,
  Flower2, Footprints, Fuel, Gem, Globe2, GripVertical, Heart, Hotel, Images,
  Info, Landmark, Laptop, LayoutGrid, Leaf, LoaderCircle, LogIn, LogOut, Map,
  MapPin, Martini, MessageCircle, Moon, Mountain, Navigation, OctagonAlert,
  PenLine, PersonStanding, Plane, Plus, Route, Search, Send, Settings,
  SlidersHorizontal, ShieldCheck, ShoppingBag, ShoppingBasket, Snowflake,
  Sparkles, Star, Store, Sun, Sunrise, Tent, TentTree, Ticket, TrainFront,
  Trash2, TreePalm, Trees, TrendingUp, TriangleAlert, User, Users, Utensils,
  Umbrella, Wallet, Waves, Wind, X, Lock, Ship,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * One name per concept, mapped onto lucide. The indirection means a call site
 * says what it means ("stay", "reality-danger") rather than which glyph it
 * picked, and the whole set can be re-skinned in one place.
 *
 * Nothing in this product uses an emoji as an icon — emoji render differently
 * per platform and read as informal.
 */
const ICONS = {
  // ---- navigation
  home: LayoutGrid,
  compass: Compass,
  plus: Plus,
  bookmark: Bookmark,
  saved: BookMarked,
  user: User,
  users: Users,
  settings: Settings,
  search: Search,
  logout: LogOut,
  filter: SlidersHorizontal,
  sort: ArrowUpDown,
  grid: LayoutGrid,

  // ---- social
  heart: Heart,
  comment: MessageCircle,
  share: Send,
  send: Send,

  // ---- trip anatomy
  pin: MapPin,
  map: Map,
  route: Route,
  navigate: Navigation,
  calendar: CalendarDays,
  clock: Clock3,
  wallet: Wallet,
  money: Banknote,
  coins: Coins,
  bed: Bed,
  camera: Camera,
  photos: Images,
  star: Star,
  verified: BadgeCheck,
  shield: ShieldCheck,

  // ---- meaning
  sparkle: Sparkles,
  flame: Flame,
  trending: TrendingUp,
  globe: Globe2,
  lock: Lock,
  eye: Eye,
  eyeOff: EyeOff,

  // ---- reality checks
  info: Info,
  warning: TriangleAlert,
  danger: OctagonAlert,

  // ---- weather
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
  windy: Wind,
  foggy: CloudFog,
  mixedWeather: CloudSun,

  // ---- seasons
  winter: Snowflake,
  spring: Flower2,
  summer: Sun,
  monsoon: CloudRain,
  autumn: Leaf,
  sunrise: Sunrise,

  // ---- place categories
  beach: Umbrella,
  mountain: Mountain,
  city: Building2,
  town: Store,
  village: Tent,
  lake: Waves,
  waterfall: Droplets,
  forest: Trees,
  desert: Sun,
  island: TreePalm,
  temple: Landmark,
  church: Church,
  mosque: Landmark,
  monument: Landmark,
  museum: Landmark,
  fort: Castle,
  park: TentTree,
  wildlife: Bird,
  viewpoint: Binoculars,
  trek: Footprints,
  restaurant: Utensils,
  cafe: Coffee,
  bar: Martini,
  hotel: Hotel,
  airport: Plane,
  station: TrainFront,
  market: ShoppingBasket,
  activity: Ticket,

  // ---- travel styles
  adventure: Mountain,
  couple: Heart,
  family: Users,
  backpacking: Backpack,
  relaxation: Armchair,
  culture: Landmark,
  food: Utensils,
  nightlife: Martini,
  photography: Camera,
  roadTrip: Car,
  budget: Coins,
  luxury: Gem,
  solo: PersonStanding,
  friends: Users,
  workation: Laptop,
  pilgrimage: Church,

  // ---- expense categories
  transport: Car,
  stay: Bed,
  shopping: ShoppingBag,
  otherSpend: CreditCard,
  bus: Bus,
  fuel: Fuel,
  ferry: Ship,
  anchor: Anchor,

  // ---- itinerary
  travel: Plane,
  checkIn: LogIn,
  checkOut: LogOut,
  sightseeing: Binoculars,
  rest: Moon,
  crown: Crown,

  // ---- controls
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUpRight: ArrowUpRight,
  check: Check,
  x: X,
  trash: Trash2,
  edit: PenLine,
  drag: GripVertical,
  spinner: LoaderCircle,
  sun: Sun,
  moon: Moon,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name, size = 20, className, filled, strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  /** Fills the glyph — active hearts and saved bookmarks. */
  filled?: boolean;
  strokeWidth?: number;
}) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden
    />
  );
}

/** Icon in a tinted rounded tile — the standard "subject marker" in lists. */
export function IconTile({
  name, size = 'md', tone = 'brand', className,
}: {
  name: IconName;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'brand' | 'neutral' | 'ember';
  className?: string;
}) {
  const boxes = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-14 w-14 rounded-2xl',
    xl: 'h-16 w-16 rounded-2xl',
  };
  const glyphs = { sm: 15, md: 18, lg: 24, xl: 28 };
  const tones = {
    brand: 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/20',
    neutral: 'bg-sunk text-ink-soft ring-1 ring-inset ring-line-soft',
    ember: 'bg-ember/10 text-ember ring-1 ring-inset ring-ember/20',
  };

  return (
    <span className={cn('grid shrink-0 place-items-center', boxes[size], tones[tone], className)}>
      <Icon name={name} size={glyphs[size]} />
    </span>
  );
}
