// ─── Digtech Academy Main App (Updated: Fresh liveclass2 & liveclass6 images) ─────
import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { simulateCompletePaymentFlow, validatePaymentDetails, getMerchantAccount } from './utils/pesapal'
import { auth, db, logActivity, supabase } from './lib/supabase'
import { CourseForm } from './components/CourseForm'
import { EnrollmentForm } from './components/EnrollmentForm'

// ─── Link Tracking System ─────────────────────────────────────────────────────
interface LinkUsageRecord {
  url: string
  platform: string
  timestamp: string
  courseTitle: string
  courseId: number
}

const LINK_USAGE_KEY = 'digtech_link_usage'

function trackLinkUsage(url: string, platform: string, courseTitle: string, courseId: number): void {
  try {
    const usageRecord: LinkUsageRecord = {
      url,
      platform,
      timestamp: new Date().toISOString(),
      courseTitle,
      courseId
    }
    
    // Get existing usage records
    const existingRecords = JSON.parse(localStorage.getItem(LINK_USAGE_KEY) || '[]')
    
    // Add new record
    existingRecords.push(usageRecord)
    
    // Save back to localStorage
    localStorage.setItem(LINK_USAGE_KEY, JSON.stringify(existingRecords))
    
    console.log(`Link usage tracked: ${platform} - ${courseTitle}`, usageRecord)
  } catch (error) {
    console.error('Failed to track link usage:', error)
  }
}

function getLinkUsage(url: string): LinkUsageRecord | null {
  try {
    const existingRecords = JSON.parse(localStorage.getItem(LINK_USAGE_KEY) || '[]')
    return existingRecords.find((record: LinkUsageRecord) => record.url === url) || null
  } catch (error) {
    console.error('Failed to get link usage:', error)
    return null
  }
}

function isLinkExpired(usageRecord: LinkUsageRecord): boolean {
  if (!usageRecord) return false
  
  const usageTime = new Date(usageRecord.timestamp)
  const now = new Date()
  const hoursDiff = (now.getTime() - usageTime.getTime()) / (1000 * 60 * 60)
  
  // Consider a link expired if it was used more than 2 hours ago
  // This is just an example - you can adjust this logic
  return hoursDiff > 2
}

function formatExpiredMessage(usageRecord: LinkUsageRecord): string {
  const usageTime = new Date(usageRecord.timestamp)
  const formattedTime = usageTime.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  })
  
  return `Link is expired - this link has been used live on ${usageRecord.platform} and time used has ${formattedTime}`
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Frame =
  | 'home'
  | 'courses'
  | 'course-detail'
  | 'student-dashboard'
  | 'tutor-dashboard'
  | 'admin-dashboard'
  | 'principal-dashboard'
  | 'live-courses'
  | 'lesson-player'
  | 'exam-player'
  | 'about'
  | 'contact'
  | 'faq'
  | 'login'
  | 'register'

interface SuccessStory {
  id: number
  name: string
  text: string
  role: string
  avatar: string
  rating: number
}

interface AdminUser {
  id: number
  name: string
  email: string
  phone: string
  role: string
  createdAt: string
}

// ─── Initial Data (Sorted Descending by Enrollment Count) ─────────────────────
const INITIAL_COURSES = [
  {
    id: 1,
    title: 'Python for Data Science & Machine Learning',
    tutor: 'Grace Nakato',
    price: 95000,
    rating: 4.9,
    students: 548,
    duration: '18 hours',
    level: 'Beginner',
    category: 'Data Science',
    image: '/images/liveclass2.png',
    free: false,
  },
  {
    id: 2,
    title: 'Full Stack Web Development with React & Node.js',
    tutor: 'David Ssekandi',
    price: 120000,
    rating: 4.8,
    students: 312,
    duration: '24 hours',
    level: 'Intermediate',
    category: 'Web Development',
    image: '/images/liveclass3.png',
    free: false,
  },
  {
    id: 3,
    title: 'Digital Marketing & Social Media Strategy',
    tutor: 'Ronald Kato',
    price: 75000,
    rating: 4.6,
    students: 274,
    duration: '10 hours',
    level: 'Beginner',
    category: 'Marketing',
    image: '/images/liveclass1.png',
    free: false,
  },
  {
    id: 4,
    title: 'Cybersecurity Essentials for Professionals',
    tutor: 'Peter Musoke',
    price: 150000,
    rating: 4.8,
    students: 201,
    duration: '20 hours',
    level: 'Advanced',
    category: 'Security',
    image: '/images/liveclass2.png',
    free: false,
  },
  {
    id: 5,
    title: 'UI/UX Design Fundamentals with Figma',
    tutor: 'Amina Nalule',
    price: 0,
    rating: 4.7,
    students: 189,
    duration: '12 hours',
    level: 'Beginner',
    category: 'Design',
    image: '/images/liveclass4.png',
    free: true,
  },
  {
    id: 6,
    title: 'Mobile App Development with Flutter',
    tutor: 'Josephine Aber',
    price: 110000,
    rating: 4.7,
    students: 163,
    duration: '16 hours',
    level: 'Intermediate',
    category: 'Mobile Dev',
    image: '/images/liveclass5.png',
    free: false,
  },
]

const TUTORS = [
  { name: 'Grace Nakato', specialty: 'Data Science', students: 548, rating: 4.9, avatar: '/images/liveclass2.png' },
  { name: 'David Ssekandi', specialty: 'Web Development', students: 312, rating: 4.8, avatar: '/images/liveclass3.png' },
  { name: 'Ronald Kato', specialty: 'Digital Marketing', students: 274, rating: 4.6, avatar: '/images/liveclass4.png' },
  { name: 'Peter Musoke', specialty: 'Cybersecurity', students: 201, rating: 4.8, avatar: '/images/liveclass5.png' },
  { name: 'Amina Nalule', specialty: 'UI/UX Design', students: 189, rating: 4.7, avatar: '/images/liveclass1.png' },
  { name: 'Collins Tumwesigye', specialty: 'Mobile App Development', students: 163, rating: 4.7, avatar: '/images/Tutor1.jpg' },
]

const LIVE_COURSES = [
  {
    id: 1,
    title: 'Certified Cloud Practitioner & DevOps Masterclass',
    trainer: 'Emmanuel Byaruhanga',
    schedule: 'Mon, Wed, Fri',
    time: '7:00 PM – 9:00 PM EAT',
    fee: 350000,
    duration: '6 weeks',
    spots: 8,
    platform: 'Google Meet',
    platformIcon: 'logos:google-meet',
    joinLink: 'https://meet.google.com/new',
    whatsappLink: 'https://wa.me/256770613201?text=I%20want%20to%20join%20Cloud%20Practitioner%20Masterclass',
    youtubeLink: 'https://www.youtube.com/@DigiTechFX',
    emailLink: 'mailto:info@digtechsolutionshub.com?subject=Cloud Practitioner Masterclass Enrollment',
    badgeColor: 'blue',
  },
  {
    id: 2,
    title: 'Advanced Financial Modeling & Excel Analytics',
    trainer: 'Flavia Namukasa',
    schedule: 'Tue, Thu, Sat',
    time: '6:00 PM – 8:00 PM EAT',
    fee: 180000,
    duration: '4 weeks',
    spots: 12,
    platform: 'Zoom',
    platformIcon: 'logos:zoom-icon',
    joinLink: 'https://zoom.us/join',
    whatsappLink: 'https://wa.me/256770613201?text=I%20want%20to%20join%20Financial%20Modeling%20Course',
    youtubeLink: 'https://www.youtube.com/@DigiTechFX',
    emailLink: 'mailto:info@digtechsolutionshub.com?subject=Financial Modeling Course Enrollment',
    badgeColor: 'cyan',
  },
  {
    id: 3,
    title: 'Content Creation, Monetization & Brand Strategy',
    trainer: 'Isaac Tumwine',
    schedule: 'Sat, Sun',
    time: '9:00 AM – 12:00 PM EAT',
    fee: 140000,
    duration: '3 weeks',
    spots: 5,
    platform: 'YouTube Live',
    platformIcon: 'logos:youtube-icon',
    joinLink: 'https://www.youtube.com/@DigiTechFX/live',
    whatsappLink: 'https://wa.me/256770613201?text=I%20want%20to%20join%20Content%20Creation%20Course',
    youtubeLink: 'https://www.youtube.com/@DigiTechFX',
    emailLink: 'mailto:info@digtechsolutionshub.com?subject=Content Creation Course Enrollment',
    badgeColor: 'purple',
  },
]

const INITIAL_TESTIMONIALS: SuccessStory[] = [
  {
    id: 1,
    name: 'Sarah Namutebi',
    text: 'Digtech Academy transformed my career completely. I went from zero coding knowledge to landing a junior developer job in Kampala in 6 months.',
    role: 'Junior Developer at Tecno Uganda',
    avatar: '/images/liveclass1.png',
    rating: 5,
  },
  {
    id: 2,
    name: 'Brian Odhiambo',
    text: 'The Data Science course was exceptionally practical. Every project directly matched what I now do daily at work. Worth every shilling!',
    role: 'Data Analyst at MTN Uganda',
    avatar: '/images/liveclass2.png',
    rating: 5,
  },
  {
    id: 3,
    name: 'Patricia Auma',
    text: 'Flexible learning that fit my busy schedule. I completed the UI/UX course in 4 weeks and immediately started winning international freelance clients.',
    role: 'Freelance Product Designer',
    avatar: '/images/liveclass3.png',
    rating: 5,
  },
  {
    id: 4,
    name: 'Michael Okello',
    text: 'Best investment in my career. The tutors are industry professionals and the hands-on projects prepared me perfectly for real-world challenges.',
    role: 'Software Engineer at Andela',
    avatar: '/images/liveclass1.png',
    rating: 5,
  },
]

const INITIAL_ADMINS: AdminUser[] = [
  {
    id: 1,
    name: 'System Admin',
    email: 'admin@digtechacademy.ug',
    phone: '+256 770 613 201',
    role: 'Course Operations Admin',
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    name: 'Sarah Mukasa',
    email: 'sarah.admin@digtechacademy.ug',
    phone: '+256 701 445 890',
    role: 'Finance & Payments Admin',
    createdAt: '2024-03-10',
  },
]

// ─── Shared UI Components ─────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-amber-500 font-bold text-sm">{rating.toFixed(1)}</span>
      <span className="text-gray-400 text-xs ml-1">/ 5.0</span>
    </div>
  )
}

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const styles: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border border-blue-100',
    cyan: 'bg-cyan-50 text-cyan-700 border border-cyan-100',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border border-amber-100',
    red: 'bg-red-50 text-red-700 border border-red-100',
    gray: 'bg-gray-100 text-gray-600',
    purple: 'bg-purple-50 text-purple-700 border border-purple-100',
  }
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${styles[color] || styles.blue}`}>
      {children}
    </span>
  )
}

function CourseCard({
  course,
  onClick,
  onEnroll,
}: {
  course: typeof INITIAL_COURSES[0]
  onClick: () => void
  onEnroll?: (course: any) => void
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover-lift transition-all cursor-pointer group animate-fade-in-up flex flex-col justify-between click-zoom"
    >
      <div>
        <div className="relative overflow-hidden bg-gray-100">
          <img
            src={course.image}
            alt={course.title}
            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {course.free && (
            <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse-glow">
              FREE
            </span>
          )}
          <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
            {course.level}
          </span>
        </div>
        <div className="p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#28C0F4]">
            {course.category}
          </span>
          <h3 className="font-bold text-gray-900 mt-1 mb-2 leading-snug line-clamp-2 group-hover:text-[#1A4095] transition-colors" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {course.title}
          </h3>
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
            <Icon icon="lucide:user" className="w-3.5 h-3.5 text-gray-400" />
            {course.tutor}
          </p>
          <StarRating rating={course.rating} />
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-gray-400" /> {course.duration}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon icon="lucide:users" className="w-3.5 h-3.5 text-gray-400" /> {course.students.toLocaleString()} enrolled
            </span>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 pt-3 border-t border-gray-50 flex items-center justify-between">
        <span className="font-extrabold text-lg text-[#1A4095]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {course.free ? 'Free' : `UGX ${course.price.toLocaleString()}`}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (onEnroll) {
              onEnroll({ id: course.id, title: course.title })
            }
          }}
          className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
          style={{ background: '#28C0F4' }}
        >
          Apply Now
        </button>
      </div>
    </div>
  )
}

// ─── Public Navigation ─────────────────────────────────────────────────────────
function PublicNav({
  frame,
  setFrame,
  currentUser,
  onLogout,
}: {
  frame: Frame
  setFrame: (f: Frame) => void
  currentUser: { email: string; role: string; name?: string } | null
  onLogout: () => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const links: { label: string; frame: Frame }[] = [
    { label: 'Home', frame: 'home' },
    { label: 'Courses', frame: 'courses' },
    { label: 'Live Classes', frame: 'live-courses' },
    { label: 'About', frame: 'about' },
    { label: 'Contact', frame: 'contact' },
    { label: 'FAQ', frame: 'faq' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm animate-fade-in-down">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo only - strictly without repeating text */}
        <button
          onClick={() => setFrame('home')}
          className="flex items-center group cursor-pointer focus:outline-none"
          title="Digtech Academy Homepage"
        >
          <img
            src="/images/Digtech Academy Logo.png"
            alt="Digtech Academy"
            className="h-8 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </button>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.frame}
              onClick={() => setFrame(l.frame)}
              className={`text-sm font-medium transition-all cursor-pointer px-4 py-2 rounded-lg ${
                frame === l.frame 
                  ? 'font-bold text-white bg-[#1A4095]' 
                  : 'text-gray-600 hover:text-white hover:bg-[#1A4095] hover:font-semibold'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Desktop Auth Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (currentUser.role === 'admin') setFrame('admin-dashboard')
                  else if (currentUser.role === 'tutor') setFrame('tutor-dashboard')
                  else if (currentUser.role === 'principal') setFrame('principal-dashboard')
                  else setFrame('student-dashboard')
                }}
                className="text-xs font-bold px-4 py-2.5 rounded-xl text-white transition-all shadow-sm hover:opacity-90 hover:scale-105 cursor-pointer blue-btn-gradient-hover"
                style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
              >
                {currentUser.role.toUpperCase()} DASHBOARD
              </button>
              <button
                onClick={onLogout}
                className="text-xs font-bold px-3.5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setFrame('login')}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl border-2 transition-all hover:bg-blue-50 hover:scale-105 cursor-pointer ${
                  frame === 'login' ? 'bg-blue-50 border-[#1A4095] text-[#1A4095]' : 'border-gray-200 text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setFrame('register')}
                className="text-xs font-bold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 hover:scale-105 shadow-sm cursor-pointer blue-btn-gradient-hover"
                style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
              >
                Create Account
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-xl"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation"
        >
          <Icon icon={mobileOpen ? 'lucide:x' : 'lucide:menu'} className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-2 animate-fade-in-down shadow-lg">
          {links.map((l) => (
            <button
              key={l.frame}
              onClick={() => {
                setFrame(l.frame)
                setMobileOpen(false)
              }}
              className={`text-left text-sm font-medium py-2.5 px-3 rounded-lg transition-all ${
                frame === l.frame 
                  ? 'bg-[#1A4095] text-white font-bold' 
                  : 'text-gray-700 hover:bg-[#1A4095] hover:text-white'
              }`}
            >
              {l.label}
            </button>
          ))}
          <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 mt-2">
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    if (currentUser.role === 'admin') setFrame('admin-dashboard')
                    else if (currentUser.role === 'tutor') setFrame('tutor-dashboard')
                    else if (currentUser.role === 'principal') setFrame('principal-dashboard')
                    else setFrame('student-dashboard')
                    setMobileOpen(false)
                  }}
                  className="w-full text-xs font-bold py-3 rounded-xl text-white flex items-center justify-center gap-1.5 blue-btn-gradient-hover"
                  style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
                >
                  <Icon icon="lucide:layout-dashboard" className="w-4 h-4" /> Go to Dashboard
                </button>
                <button
                  onClick={() => {
                    onLogout()
                    setMobileOpen(false)
                  }}
                  className="w-full text-xs font-bold py-2.5 rounded-xl border border-red-200 text-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setFrame('login')
                    setMobileOpen(false)
                  }}
                  className="w-full text-xs font-bold py-2.5 rounded-xl border-2 border-[#1A4095] text-[#1A4095] flex items-center justify-center gap-1.5"
                >
                  <Icon icon="lucide:lock" className="w-4 h-4" /> Sign In
                </button>
                <button
                  onClick={() => {
                    setFrame('register')
                    setMobileOpen(false)
                  }}
                  className="w-full text-xs font-bold py-2.5 rounded-xl text-white blue-btn-gradient-hover"
                  style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

// ─── Footer Component (White Theme & Complete Specs) ──────────────────────────
function Footer({ setFrame }: { setFrame: (f: Frame) => void }) {
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  // Update East African Time (EAT) every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      // EAT is UTC+3
      const eatTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }))
      
      // Format time
      const timeFormatted = eatTime.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
      
      // Format date
      const dateFormatted = eatTime.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      
      setCurrentTime(timeFormatted)
      setCurrentDate(dateFormatted)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <footer className="bg-[#04263A] border-t border-gray-700 text-gray-300 py-12 footer-animate">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand & Socials */}
        <div className="space-y-4 footer-section">
          <div className="flex items-center">
            <img
              src="/images/Digtech Academy Logo White.png"
              alt="Digtech Academy"
              className="h-10 w-auto object-contain"
            />
          </div>
          <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
            Uganda's premier digital skills academy. Practical, tutor-led courses in tech, business, and trades — learn on any connection, pay in UGX via PesaPal.
          </p>
          <div className="pt-2">
            <p className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Connect With Us</p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: 'lucide:facebook', href: 'https://www.facebook.com/digtechsolutionshub/', label: 'Facebook' },
                { icon: 'lucide:instagram', href: 'https://instagram.com/digtechacademy', label: 'Instagram' },
                { icon: 'lucide:twitter', href: 'https://x.com/Digtech1', label: 'X (Twitter)' },
                { icon: 'mdi:tiktok', href: 'https://www.tiktok.com/@korabusiness/video/7543967921161112888', label: 'TikTok' },
                { icon: 'lucide:linkedin', href: 'https://ug.linkedin.com/company/digtech-solutions-hub', label: 'LinkedIn' },
                { icon: 'lucide:youtube', href: 'https://www.youtube.com/@DigiTechFX', label: 'YouTube' },
                { icon: 'mdi:whatsapp', href: 'https://wa.me/256770613201', label: 'WhatsApp' },
                { icon: 'lucide:mail', href: 'mailto:info@digtechsolutionshub.com', label: 'Email' },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#28C0F4] transition-all shadow-sm footer-social-icon"
                >
                  <Icon icon={s.icon} className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-section">
          <h4 className="text-white font-bold text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Quick Links
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <button onClick={() => setFrame('home')} className="text-gray-400 hover:text-[#28C0F4] transition-colors footer-link">
                Home
              </button>
            </li>
            <li>
              <button onClick={() => setFrame('courses')} className="text-gray-400 hover:text-[#28C0F4] transition-colors footer-link">
                Browse Courses
              </button>
            </li>
            <li>
              <button onClick={() => setFrame('live-courses')} className="text-gray-400 hover:text-[#28C0F4] transition-colors footer-link">
                Live Classes
              </button>
            </li>
            <li>
              <button onClick={() => setFrame('about')} className="text-gray-400 hover:text-[#28C0F4] transition-colors footer-link">
                About Academy
              </button>
            </li>
            <li>
              <button onClick={() => setFrame('faq')} className="text-gray-400 hover:text-[#28C0F4] transition-colors footer-link">
                Frequently Asked Questions
              </button>
            </li>
            <li>
              <button onClick={() => setFrame('contact')} className="text-gray-400 hover:text-[#28C0F4] transition-colors footer-link">
                Contact & Support
              </button>
            </li>
          </ul>
        </div>

        {/* Course Categories */}
        <div className="footer-section">
          <h4 className="text-white font-bold text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Course Categories
          </h4>
          <ul className="space-y-2.5 text-xs">
            {['Web Development', 'Data Science', 'UI/UX Design', 'Digital Marketing', 'Cybersecurity', 'Mobile App Development'].map((cat) => (
              <li key={cat}>
                <button onClick={() => setFrame('courses')} className="text-gray-400 hover:text-[#28C0F4] transition-colors footer-link">
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Support & Contact Details */}
        <div className="footer-section">
          <h4 className="text-white font-bold text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Support
          </h4>
          <ul className="space-y-3 text-xs text-gray-400">
            <li className="flex items-start gap-2.5">
              <Icon icon="lucide:map-pin" className="w-4 h-4 text-[#28C0F4] flex-shrink-0 mt-0.5" />
              <span>Level 2 Grand West Arcade, High Street Mbarara City - Uganda</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon icon="lucide:phone" className="w-4 h-4 text-[#28C0F4] flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <a href="tel:+256702524736" className="hover:underline footer-link">Airtel: +256 702 524 736</a>
                <a href="tel:+256770613201" className="hover:underline footer-link">MTN: +256 770 613 201</a>
              </div>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon icon="lucide:mail" className="w-4 h-4 text-[#28C0F4] flex-shrink-0" />
              <a href="mailto:info@digtechsolutionshub.com" className="hover:underline footer-link">info@digtechsolutionshub.com</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Embedded Google Map for Mbarara Location – pinned to Grand West Arcade, High Street */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 animate-slide-in-bottom">
        <div className="relative rounded-2xl overflow-hidden border-2 border-[#28C0F4]/30 shadow-lg hover:shadow-2xl transition-all ease-in-out" style={{ boxShadow: '0 10px 40px rgba(40, 192, 244, 0.2)', height: '280px' }}>
          {/* Map iframe pinned exactly to Grand West Arcade, Mbarara */}
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.762049537014!2d30.65782831531888!3d-0.6066019997004887!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x176584af1e2a08ff%3A0x2e5b2e8e5e5f1234!2sGrand%20West%20Arcade%2C%20High%20Street%2C%20Mbarara%2C%20Uganda!5e0!3m2!1sen!2sug!4v1724000000000!5m2!1sen!2sug"
            className="w-full h-full border-0"
            loading="lazy"
            allowFullScreen
            title="Digtech Academy – Grand West Arcade, High Street, Mbarara"
            style={{ border: 0 }}
          />
          {/* Floating location badge with ripple animation */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 border border-[#28C0F4]/30">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#1A4095] to-[#28C0F4] flex items-center justify-center flex-shrink-0">
              {/* Ripple waves animation */}
              <div className="absolute inset-0 rounded-full bg-[#28C0F4] animate-ping opacity-30"></div>
              <div className="absolute inset-0 rounded-full bg-[#28C0F4] animate-pulse opacity-20" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#1A4095]">Digtech Academy</div>
              <div className="text-[10px] text-gray-500">Grand West Arcade, Level 2 · High Street, Mbarara</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live East African Time Display with Ripple Animation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <div className="relative flex items-center justify-center py-8">
          {/* Ripple waves emanating from center (water droplet effect) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-48 h-32 rounded-3xl border-4 border-[#28C0F4] opacity-40 animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="absolute w-64 h-40 rounded-3xl border-4 border-[#1A4095] opacity-30 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
            <div className="absolute w-80 h-48 rounded-3xl border-4 border-[#28C0F4] opacity-20 animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
          </div>
          
          {/* Central time display in small rectangle */}
          <div 
            className="relative z-10 flex flex-col items-center justify-center gap-1 py-4 px-8 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 50%, #1A4095 100%)',
              boxShadow: '0 15px 50px rgba(40, 192, 244, 0.5), 0 0 60px rgba(26, 64, 149, 0.4), inset 0 0 30px rgba(255, 255, 255, 0.1)',
              border: '3px solid rgba(255, 215, 0, 0.3)',
              minWidth: '240px',
              maxWidth: '280px'
            }}
          >
            {/* Digtech logo icon overlay */}
            <div 
              className="absolute inset-0 opacity-15 rounded-2xl"
              style={{
                backgroundImage: 'url(/images/Digtech Academy Logo Icon White.png)',
                backgroundSize: '60%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                mixBlendMode: 'overlay'
              }}
            ></div>
            
            {/* Time content */}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className="text-2xl md:text-3xl font-extrabold" style={{ color: '#FFD700', fontFamily: 'Montserrat, monospace', textShadow: '0 0 25px rgba(255,215,0,0.9), 0 0 50px rgba(255,215,0,0.6), 0 3px 15px rgba(0,0,0,0.8)' }}>
                {currentTime}
              </div>
              <div className="text-[10px] font-bold" style={{ color: '#FFFFFF', textShadow: '0 3px 10px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.7)' }}>
                {currentDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partnership / Powered By Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-8 border-t border-gray-700">
        <div className="text-center mb-6">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            Digtech in Partnership With
          </h3>
          <p className="text-xs text-gray-500 mt-1">Powered by industry-leading partners</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6 items-center justify-items-center">
          {[
            { num: 1, url: 'https://innovationhub.ug/', name: 'Innovation Hub Uganda' },
            { num: 2, url: 'https://www.w3schools.com/', name: 'W3Schools' },
            { num: 3, url: 'https://www.nita.go.ug/', name: 'NITA Uganda' },
            { num: 4, url: 'https://www.microsoft.com/en-us/software-download/windows11', name: 'Microsoft Windows 11' },
            { num: 5, url: '#', name: 'Partner 5' },
            { num: 6, url: 'https://hivecolab.org/', name: 'Hive Colab Uganda' },
          ].map((partner) => (
            <a
              key={partner.num}
              href={partner.url}
              target={partner.url !== '#' ? '_blank' : '_self'}
              rel={partner.url !== '#' ? 'noopener noreferrer' : undefined}
              className="w-full max-w-[140px] h-20 bg-white/5 backdrop-blur-sm rounded-xl p-3 hover:bg-white/10 transition-all hover:scale-105 flex items-center justify-center border border-gray-700/50 hover:border-[#28C0F4]/30"
              title={partner.name}
            >
              <img
                src={`/images/footerpic${partner.num}.${partner.num === 1 ? 'jfif' : 'png'}`}
                alt={partner.name}
                className="w-full h-full object-contain filter brightness-90 hover:brightness-110 transition-all"
              />
            </a>
          ))}
        </div>
      </div>

      {/* Automatic Year Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
        <p>© {new Date().getFullYear()} Digtech Academy. All rights reserved.</p>
        <p className="flex items-center gap-2">
          <span>Official Payment Partner:</span>
          <span className="font-bold text-[#28C0F4]">PesaPal Payments Uganda</span>
        </p>
      </div>
    </footer>
  )
}

// ─── HOME PAGE ─────────────────────────────────────────────────────────────────
function HomePage({
  setFrame,
  testimonials,
  onEnroll,
}: {
  setFrame: (f: Frame) => void
  testimonials: SuccessStory[]
  onEnroll: (course?: { id: number; title: string }) => void
}) {
  const [searchQ, setSearchQ] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Carousel images
  const carouselImages = [
    '/images/liveclass1.png',
    '/images/liveclass2.png',
    '/images/liveclass3.png',
    '/images/liveclass4.png',
    '/images/liveclass5.png',
    '/images/liveclass1.png',
  ]

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length)
    }, 7000) // Change image every 7 seconds
    
    return () => clearInterval(interval)
  }, [])

  // Sorted descending by enrollment count
  const sortedCourses = [...INITIAL_COURSES].sort((a, b) => b.students - a.students)

  const searchResults =
    searchQ.trim().length > 0
      ? INITIAL_COURSES.filter(
          (c) =>
            c.title.toLowerCase().includes(searchQ.toLowerCase()) ||
            c.category.toLowerCase().includes(searchQ.toLowerCase()) ||
            c.tutor.toLowerCase().includes(searchQ.toLowerCase())
        )
      : []

  const categories = [
    { name: 'Web Development', icon: 'lucide:globe', color: '#1A4095' },
    { name: 'Data Science', icon: 'lucide:bar-chart-3', color: '#10B981' },
    { name: 'Design', icon: 'lucide:palette', color: '#F59E0B' },
    { name: 'Marketing', icon: 'lucide:megaphone', color: '#EC4899' },
    { name: 'Security', icon: 'lucide:shield', color: '#EF4444' },
    { name: 'Mobile Dev', icon: 'lucide:smartphone', color: '#8B5CF6' },
  ]

  return (
    <div>
      {/* Marquee Banner */}
      <div className="marquee-banner">
        <div className="marquee-content">
          <span><Icon icon="lucide:graduation-cap" className="inline w-4 h-4 mr-2" />Uganda's Leading Online Digital Academy</span>
          <span><Icon icon="lucide:book-open" className="inline w-4 h-4 mr-2" />Expert-Led Courses</span>
          <span><Icon icon="lucide:laptop" className="inline w-4 h-4 mr-2" />Learn Tech, Business & Trades</span>
          <span><Icon icon="lucide:award" className="inline w-4 h-4 mr-2" />Accredited Certificates</span>
          <span><Icon icon="lucide:credit-card" className="inline w-4 h-4 mr-2" />Pay in UGX via PesaPal</span>
          <span><Icon icon="lucide:graduation-cap" className="inline w-4 h-4 mr-2" />Uganda's Leading Online Digital Academy</span>
          <span><Icon icon="lucide:book-open" className="inline w-4 h-4 mr-2" />Expert-Led Courses</span>
          <span><Icon icon="lucide:laptop" className="inline w-4 h-4 mr-2" />Learn Tech, Business & Trades</span>
          <span><Icon icon="lucide:award" className="inline w-4 h-4 mr-2" />Accredited Certificates</span>
          <span><Icon icon="lucide:credit-card" className="inline w-4 h-4 mr-2" />Pay in UGX via PesaPal</span>
        </div>
      </div>

      {/* Magnetic Field Animation */}
      <div className="magnetic-field-container">
        <div className="magnetic-field-orb orb-1"></div>
        <div className="magnetic-field-orb orb-2"></div>
        <div className="magnetic-field-orb orb-3"></div>
        <div className="magnetic-field-orb orb-4"></div>
        <div className="magnetic-field-orb orb-5"></div>
        <div className="magnetic-field-orb orb-6"></div>
      </div>

      {/* Hero Section */}
      <section
        className="relative overflow-hidden click-zoom"
        style={{ background: 'linear-gradient(135deg, #1A4095 0%, #0f2660 60%, #1A4095 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-56 h-56 rounded-full blur-3xl bg-[#28C0F4]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="animate-fade-in-left">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6">
              <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full animate-pulse bg-[#28C0F4]" />
              <span className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                Uganda's Leading Online Digital Academy
              </span>
            </div>
            <h1
              className="text-white font-extrabold text-3xl sm:text-4xl md:text-5xl leading-tight mb-4 sm:mb-6"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Master In-Demand <br />
              <span className="text-[#28C0F4]">Digital Skills</span> & Career Growth
            </h1>
            <p className="text-white/80 text-sm sm:text-base mb-6 sm:mb-8 leading-relaxed">
              Expert-led courses, live hands-on classes, and accredited certifications. Pay easily in UGX with PesaPal and learn at your own pace.
            </p>

            {/* Live Search Appearance with Autocomplete Dropdown */}
            <div className="relative max-w-lg">
              <div className="flex gap-1 sm:gap-2 bg-white rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-2xl">
                <div className="flex items-center pl-2 sm:pl-3 text-gray-400">
                  <Icon icon="lucide:search" className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => {
                    setSearchQ(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search courses..."
                  className="flex-1 px-1 sm:px-2 py-2 sm:py-3 text-gray-800 text-xs sm:text-sm outline-none bg-transparent placeholder-gray-400 font-medium"
                />
                <button
                  onClick={() => setFrame('courses')}
                  className="text-white text-[10px] sm:text-xs font-bold px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer click-zoom"
                  style={{ background: '#28C0F4' }}
                >
                  Search
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-down max-h-60 sm:max-h-80 overflow-y-auto">
                  <div className="p-2 bg-gray-50 text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Suggested Courses ({searchResults.length})
                  </div>
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setShowSuggestions(false)
                        setFrame('course-detail')
                      }}
                      className="w-full text-left p-2.5 sm:p-3.5 hover:bg-blue-50/60 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <img src={c.image} alt="" className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] sm:text-xs font-bold text-gray-900 truncate">{c.title}</div>
                          <div className="text-[10px] sm:text-[11px] text-gray-500 flex items-center gap-1 sm:gap-2 mt-0.5">
                            <span className="text-[#28C0F4] font-semibold truncate">{c.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-xs font-extrabold text-[#1A4095]">
                          {c.free ? 'Free' : `UGX ${c.price.toLocaleString()}`}
                        </div>
                        <div className="text-[10px] text-gray-400">{c.students} enrolled</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="animate-fade-in-right">
            <div className="relative section-zoom-animate">
              <button 
                onClick={() => setFrame('courses')}
                className="block w-full cursor-pointer group overflow-hidden rounded-2xl sm:rounded-3xl"
              >
                {/* Image Carousel */}
                <div className="relative w-full h-[280px] sm:h-[360px] md:h-[420px]">
                  {carouselImages.map((img, index) => (
                    <img
                      key={img}
                      src={img}
                      alt={`Students learning tech skills at Digtech Academy - Image ${index + 1}`}
                      className={`absolute inset-0 w-full h-full object-cover rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-[#28C0F4]/40 image-with-blue-border transition-all duration-1000 ${
                        index === currentImageIndex 
                          ? 'opacity-100 scale-100' 
                          : 'opacity-0 scale-95'
                      }`}
                      style={{ transition: 'opacity 1s ease-in-out, transform 1s ease-in-out' }}
                    />
                  ))}
                  
                  {/* Carousel Indicators */}
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-10">
                    {carouselImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentImageIndex(index)
                        }}
                        className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full transition-all ${
                          index === currentImageIndex 
                            ? 'bg-[#FFD700] w-6 sm:w-8' 
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </button>
              <button 
                onClick={() => setFrame('about')}
                className="absolute -bottom-4 sm:-bottom-6 -left-4 sm:-left-6 bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 animate-float hover:scale-110 transition-transform cursor-pointer z-20 hidden sm:block"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Icon icon="lucide:award" className="w-5 sm:w-6 h-5 sm:h-6" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-gray-900">Verified Certificates</div>
                    <div className="text-[10px] sm:text-xs text-gray-500">Recognized by Top Employers</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16 bg-gray-50 section-zoom-animate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[#28C0F4] mb-2">Explore Skills</p>
            <h2 className="text-3xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Top Learning Categories
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setFrame('courses')}
                className="bg-white p-5 rounded-2xl border-2 border-[#28C0F4]/30 text-center hover-lift transition-all group cursor-pointer shadow-sm blue-accent-overlay click-zoom card-flip-hover"
              >
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow-sm"
                  style={{ background: cat.color }}
                >
                  <Icon icon={cat.icon} className="w-6 h-6" />
                </div>
                <div className="font-bold text-xs text-gray-900 group-hover:text-[#1A4095]">{cat.name}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses (Ordered Descending by Enrollment Count) */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#28C0F4] mb-2">Popular Programs</p>
              <h2 className="text-3xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Featured Courses
              </h2>
              <p className="text-xs text-gray-500 mt-1">Sorted by highest student enrollment and ratings</p>
            </div>
            <button
              onClick={() => setFrame('courses')}
              className="text-xs font-bold text-[#1A4095] hover:text-[#28C0F4] flex items-center gap-1 cursor-pointer"
            >
              View All Courses <Icon icon="lucide:chevron-right" className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCourses.slice(0, 6).map((c) => (
              <CourseCard key={c.id} course={c} onClick={() => setFrame('course-detail')} onEnroll={onEnroll} />
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories (Admin Managed) */}
      <section
        style={{ background: 'linear-gradient(135deg, #1A4095 0%, #0f2660 100%)' }}
        className="py-20 text-white section-zoom-animate"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[#28C0F4] mb-2">Student Testimonials</p>
            <h2 className="text-3xl font-extrabold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Real Success Stories
            </h2>
            <p className="text-white/70 text-sm mt-1 max-w-lg mx-auto">
              Read how Digtech Academy students are transforming their careers across East Africa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col card-flip-hover animate-slide-in-bottom"
              >
                {/* Profile picture on top */}
                <div className="flex justify-center mb-4">
                  <img 
                    src={t.avatar} 
                    alt={t.name} 
                    className="w-20 h-20 rounded-full object-cover border-4 border-[#1A4095] shadow-lg" 
                  />
                </div>
                
                <div className="flex-1">
                  <div className="mb-4">
                    <span className="text-amber-500 font-bold text-lg">{t.rating.toFixed(1)}</span>
                    <span className="text-gray-400 text-sm ml-1">/ 5.0</span>
                  </div>
                  <p className="text-white/90 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                </div>
                
                <button 
                  onClick={() => window.open('https://www.youtube.com/@DigiTechFX/live', '_blank', 'noopener,noreferrer')}
                  className="flex items-center justify-between pt-4 border-t border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="text-left">
                    <div className="font-bold text-sm text-white">{t.name}</div>
                    <div className="text-xs text-white/60">{t.role}</div>
                  </div>
                  <div className="px-4 py-2 bg-[#1A4095] text-white rounded-lg text-xs font-bold hover:bg-[#28C0F4] transition-colors">
                    View Story
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── COURSES PAGE ──────────────────────────────────────────────────────────────
function CoursesPage({ setFrame, onEnroll }: { setFrame: (f: Frame) => void; onEnroll: (course?: { id: number; title: string }) => void }) {
  const [selectedCat, setSelectedCat] = useState('All')
  const [selectedLevel, setSelectedLevel] = useState('All')
  const [searchQ, setSearchQ] = useState('')

  const categories = ['All', 'Web Development', 'Data Science', 'Design', 'Marketing', 'Security', 'Mobile Dev']
  const levels = ['All', 'Beginner', 'Intermediate', 'Advanced']

  const filtered = INITIAL_COURSES.filter((c) => {
    if (selectedCat !== 'All' && c.category !== selectedCat) return false
    if (selectedLevel !== 'All' && c.level !== selectedLevel) return false
    if (searchQ.trim() && !c.title.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  }).sort((a, b) => b.students - a.students)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Explore Academy Courses
        </h1>
        <p className="text-gray-500 text-sm">Showing {filtered.length} courses ordered by enrollment popularity</p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by title or topic..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1A4095]"
            />
            <Icon icon="lucide:search" className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Level:</span>
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setSelectedLevel(l)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                  selectedLevel === l ? 'bg-[#1A4095] text-white border-[#1A4095]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase self-center mr-2">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`text-xs px-3.5 py-1.5 rounded-full border font-semibold transition-all ${
                selectedCat === cat
                  ? 'bg-[#28C0F4] text-white border-[#28C0F4] shadow-sm'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Icon icon="lucide:search-x" className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-600">No courses found matching your criteria</p>
          <button
            onClick={() => {
              setSelectedCat('All')
              setSelectedLevel('All')
              setSearchQ('')
            }}
            className="mt-3 text-xs font-bold text-[#1A4095] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 section-zoom-animate">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} onClick={() => setFrame('course-detail')} onEnroll={onEnroll} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── LIVE COURSES PAGE (With Platform Links & Details) ────────────────────────
function LiveCoursesPage({ onEnroll }: { onEnroll?: (course?: { id: number; title: string; price?: number }) => void }) {
  const [selectedCourse, setSelectedCourse] = useState<typeof LIVE_COURSES[0] | null>(null)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [appliedSuccess, setAppliedSuccess] = useState(false)
  const [expiredLinkMessage, setExpiredLinkMessage] = useState<string>('')
  const [showExpiredAlert, setShowExpiredAlert] = useState(false)

  // Handle live class link clicks with expiration check
  const handleLinkClick = (url: string, platform: string, courseTitle: string, courseId: number) => {
    const usageRecord = getLinkUsage(url)
    
    if (usageRecord && isLinkExpired(usageRecord)) {
      // Link has been used and is expired
      const message = formatExpiredMessage(usageRecord)
      setExpiredLinkMessage(message)
      setShowExpiredAlert(true)
      return
    }
    
    // Track the usage
    trackLinkUsage(url, platform, courseTitle, courseId)
    
    // Open the link
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-12">
        <p className="text-xs font-bold uppercase tracking-wider text-[#28C0F4] mb-2">Real-Time Interaction</p>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Live Online Classes
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm">
          Interactive cohort-based sessions streamed directly on Google Meet, Zoom, and TikTok Live. Direct mentorship, Q&A, and practical code reviews.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12 section-zoom-animate">
        {LIVE_COURSES.map((lc) => (
          <div
            key={lc.id}
            className="bg-white rounded-3xl border-2 border-[#28C0F4]/30 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between card-hover click-zoom card-flip-hover"
          >
            <div className="p-1" style={{ background: 'linear-gradient(135deg, #1A4095, #28C0F4)' }}>
              <div className="bg-white rounded-[22px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge color={lc.badgeColor}>{lc.duration.toUpperCase()}</Badge>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {lc.spots} spots left
                  </div>
                </div>

                <h2 className="font-bold text-gray-900 text-lg leading-snug mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {lc.title}
                </h2>
                <p className="text-xs text-gray-500 mb-5 flex items-center gap-1.5">
                  <Icon icon="lucide:user" className="w-4 h-4 text-gray-400" />
                  Lead Trainer: <span className="font-semibold text-gray-800">{lc.trainer}</span>
                </p>

                {/* Platform Tag */}
                <div className="mb-5 p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <Icon icon={lc.platformIcon} className="w-5 h-5" />
                    <span>Hosted on {lc.platform}</span>
                  </div>
                  <a
                    onClick={(e) => {
                      e.preventDefault()
                      handleLinkClick(lc.joinLink, 'Test Link', lc.title, lc.id)
                    }}
                    href="#"
                    className="text-[11px] font-bold text-[#1A4095] hover:text-[#28C0F4] flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    Test Link <Icon icon="lucide:external-link" className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2.5">
                    <Icon icon="lucide:calendar" className="w-4 h-4 text-gray-400" />
                    <span>Schedule: <strong className="text-gray-800">{lc.schedule}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Icon icon="lucide:clock" className="w-4 h-4 text-gray-400" />
                    <span>Timing: <strong className="text-gray-800">{lc.time}</strong></span>
                  </div>
                </div>

                {/* Live Platform Links */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-[11px] font-bold text-gray-400 uppercase mb-2">Join Via:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleLinkClick(lc.joinLink, lc.platform, lc.title, lc.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                      title={lc.platform}
                    >
                      <Icon icon={lc.platformIcon} className="w-4 h-4" />
                      {lc.platform}
                    </button>
                    <button
                      onClick={() => handleLinkClick(lc.whatsappLink, 'WhatsApp', lc.title, lc.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer"
                      title="WhatsApp"
                    >
                      <Icon icon="mdi:whatsapp" className="w-4 h-4" />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleLinkClick(lc.youtubeLink, 'YouTube', lc.title, lc.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                      title="YouTube"
                    >
                      <Icon icon="lucide:youtube" className="w-4 h-4" />
                      YouTube
                    </button>
                    <a
                      href={lc.emailLink}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      title="Email"
                    >
                      <Icon icon="lucide:mail" className="w-4 h-4" />
                      Email
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
                  <div>
                    <div className="text-[11px] text-gray-400 uppercase font-semibold">Tuition Fee</div>
                    <div className="text-xl font-extrabold text-[#1A4095]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      UGX {lc.fee.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (onEnroll) {
                        onEnroll({ id: lc.id, title: lc.title, price: lc.fee })
                      } else {
                        setSelectedCourse(lc)
                        setShowApplyModal(true)
                        setAppliedSuccess(false)
                      }
                    }}
                    className="text-xs font-bold text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-sm cursor-pointer blue-btn-gradient-hover"
                    style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Apply Modal */}
      {showApplyModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Join Live Class Cohort
              </h2>
              <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-gray-600">
                <Icon icon="lucide:x" className="w-5 h-5" />
              </button>
            </div>

            {appliedSuccess ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Icon icon="lucide:check-circle" className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Application Submitted!</h3>
                <p className="text-xs text-gray-500 mb-4">
                  We have sent the live cohort link and schedule details to your WhatsApp and email.
                </p>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="w-full py-3 rounded-xl bg-[#1A4095] text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setAppliedSuccess(true)
                }}
                className="space-y-4"
              >
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs">
                  <div className="font-bold text-gray-900">{selectedCourse.title}</div>
                  <div className="text-gray-500 mt-0.5">{selectedCourse.schedule} • {selectedCourse.time}</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Isaac Mugisha"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Phone / WhatsApp Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+256 700 000 000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-white font-bold text-xs shadow-md mt-2 blue-btn-gradient-hover"
                  style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
                >
                  Submit & Get Live Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Expired Link Alert Modal */}
      {showExpiredAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="lucide:clock-x" className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Link Expired
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-800 leading-relaxed">
                  {expiredLinkMessage}
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setShowExpiredAlert(false)}
                  className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Understood
                </button>
                <p className="text-xs text-gray-500">
                  Please contact support for a new live class link or check the schedule for upcoming sessions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COURSE DETAIL & PESAPAL PAYMENT ──────────────────────────────────────────
function CourseDetailPage({ onEnroll }: { onEnroll: (course?: { id: number; title: string }) => void }) {
  const course = INITIAL_COURSES[0]
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentReference, setPaymentReference] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [method, setMethod] = useState<'momo' | 'airtel' | 'card' | 'bank'>('momo')
  const [errorMessage, setErrorMessage] = useState('')

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentProcessing(true)
    setErrorMessage('')

    try {
      // Validate payment details using PesaPal utility
      const validation = validatePaymentDetails(
        phone,
        email,
        firstName,
        lastName,
        method === 'momo' ? 'MTN' : method === 'airtel' ? 'AIRTEL' : 'MTN'
      )
      
      if (!validation.valid) {
        throw new Error(validation.errors.join('. '))
      }

      // Map method to PesaPal format
      const paymentMethod = method === 'momo' ? 'MTN' : method === 'airtel' ? 'AIRTEL' : 'MTN'
      const merchantAccount = getMerchantAccount(paymentMethod)
      
      // Initiate phone payment via PesaPal
      const paymentResult = await simulateCompletePaymentFlow(
        course.price,
        phone,
        paymentMethod,
        `Enrollment: ${course.title}`
      )

      if (!paymentResult.success) {
        throw new Error(paymentResult.message)
      }

      setPaymentReference(paymentResult.reference)
      setPaymentSuccess(true)
      
      // Show merchant account info in success message
      alert(`✅ SMS with PIN prompt sent to ${phone}!\n\n${paymentResult.message}\n\nPlease check your phone and enter PIN to authorize payment.\n\nMerchant Account: ${merchantAccount}`)
    } catch (error: any) {
      setErrorMessage(error.message || 'Payment failed. Please try again.')
    } finally {
      setPaymentProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1A4095 0%, #0f2660 100%)' }} className="text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="flex gap-2 mb-4">
              <Badge color="cyan">{course.category}</Badge>
              <Badge color="green">{course.level}</Badge>
            </div>
            <h1 className="text-3xl font-extrabold mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {course.title}
            </h1>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              Master industrial machine learning, statistical modeling, and data pipelines using Python, Pandas, Scikit-Learn, and PyTorch.
            </p>
            <div className="flex flex-wrap gap-5 text-xs text-white/80">
              <span className="flex items-center gap-1.5"><Icon icon="lucide:clock" className="w-4 h-4 text-[#28C0F4]" /> {course.duration}</span>
              <span className="flex items-center gap-1.5"><Icon icon="lucide:users" className="w-4 h-4 text-[#28C0F4]" /> {course.students} enrolled</span>
              <span className="flex items-center gap-1.5"><Icon icon="lucide:globe" className="w-4 h-4 text-[#28C0F4]" /> English & Luganda support</span>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-white rounded-3xl p-6 text-gray-900 shadow-2xl border border-white/20">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Course Fee</div>
            <div className="text-3xl font-extrabold text-[#1A4095] mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              UGX {course.price.toLocaleString()}
            </div>
            <button
              onClick={() => onEnroll({ id: course.id, title: course.title })}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all mb-3 cursor-pointer"
              style={{ background: '#28C0F4' }}
            >
              Apply Now - Complete Enrollment Form
            </button>
            <div className="space-y-2 text-xs text-gray-600 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2"><Icon icon="lucide:check-circle" className="w-4 h-4 text-emerald-500" /> Instant access to all modules</div>
              <div className="flex items-center gap-2"><Icon icon="lucide:check-circle" className="w-4 h-4 text-emerald-500" /> Verifiable Certificate included</div>
              <div className="flex items-center gap-2"><Icon icon="lucide:check-circle" className="w-4 h-4 text-emerald-500" /> Direct tutor Q&A support</div>
            </div>
          </div>
        </div>
      </div>

      {/* PesaPal Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-gray-100">
            {/* Header with PesaPal Badge */}
            <div className="p-4 bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white text-[#1A4095] text-[10px] font-extrabold px-2 py-0.5 rounded shadow">
                  PESAPAL
                </div>
                <span className="text-xs font-bold">Secure Payment Gateway</span>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-white/80 hover:text-white">
                <Icon icon="lucide:x" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {paymentSuccess ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon icon="lucide:check-circle" className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    PIN Prompt Sent!
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Reference ID: <strong className="text-gray-800">{paymentReference}</strong>
                    <br />
                    📱 SMS with PIN prompt sent to <strong>{phone}</strong>
                    <br />
                    💰 Please check your phone and enter PIN to authorize payment
                    <br />
                    📧 Receipt will be emailed to {email}.
                    <br />
                    <br />
                    <strong>Merchant Account:</strong> {method === 'momo' ? 'MTN: 0770613201' : method === 'airtel' ? 'Airtel: 0702524736' : 'Check SMS for details'}
                  </p>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full py-3 rounded-xl bg-[#1A4095] text-white font-bold text-xs"
                  >
                    Close & Wait for SMS
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handlePayment}
                  className="space-y-4"
                >
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Course Enrollment</div>
                      <div className="text-xs font-bold text-gray-900 line-clamp-1">{course.title}</div>
                    </div>
                    <div className="text-base font-extrabold text-[#1A4095]">
                      UGX {course.price.toLocaleString()}
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                      <Icon icon="lucide:alert-circle" className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. John"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Doe"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      Select Payment Channel
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'momo', label: 'MTN MoMo', icon: 'lucide:smartphone', note: '0770613201' },
                        { id: 'airtel', label: 'Airtel Money', icon: 'lucide:phone-call', note: '0702524736' },
                        { id: 'card', label: 'Visa / Card', icon: 'lucide:credit-card', note: '' },
                        { id: 'bank', label: 'Bank Transfer', icon: 'lucide:building-2', note: '' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.id as any)}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-start gap-0.5 transition-all ${
                            method === m.id
                              ? 'border-[#1A4095] bg-blue-50 text-[#1A4095]'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon icon={m.icon} className="w-4 h-4" />
                            {m.label}
                          </div>
                          {m.note && (
                            <span className="text-[10px] text-gray-500 font-normal">{m.note}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Mobile Number / Account *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0770123456"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={paymentProcessing}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-xs shadow-lg hover:opacity-90 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed blue-btn-gradient-hover"
                    style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
                  >
                    {paymentProcessing ? (
                      <>
                        <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>Pay UGX {course.price.toLocaleString()} via PesaPal</>
                    )}
                  </button>

                  <div className="text-center text-[10px] text-gray-400 flex items-center justify-center gap-1.5">
                    <Icon icon="lucide:shield-check" className="w-3.5 h-3.5 text-emerald-500" />
                    256-bit Encrypted | PesaPal API v3
                  </div>
                  <div className="text-center text-[10px] text-gray-500">
                    Merchant Accounts: Airtel (0702524736) | MTN (0770613201)
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FAQ PAGE (Dedicated Page) ─────────────────────────────────────────────────
function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [activeCategory, setActiveCategory] = useState('All')

  const faqs = [
    {
      category: 'Enrollment & Access',
      q: 'How do I enroll and start learning a course?',
      a: 'Browse through our courses catalog, click "Enroll Now", and complete the checkout using PesaPal. You will receive immediate dashboard access and an SMS confirmation with your login details.',
    },
    {
      category: 'Payments',
      q: 'What payment methods are supported via PesaPal?',
      a: 'Through our official PesaPal integration, we accept MTN Mobile Money, Airtel Money, Visa, Mastercard, and direct bank transfers in Ugandan Shillings (UGX).',
    },
    {
      category: 'Live Classes',
      q: 'How do live online classes work?',
      a: 'Live classes are real-time sessions hosted on Google Meet, Zoom, and TikTok Live. Trainers demonstrate code live, review assignments, and answer questions directly.',
    },
    {
      category: 'Certificates',
      q: 'Are certificates verifiable by employers?',
      a: 'Yes! Upon 100% course completion and project submission, you earn a digital certificate equipped with a unique QR code and verification ID for employers.',
    },
    {
      category: 'Tutors & Support',
      q: 'Can I interact with my tutor during self-paced courses?',
      a: 'Absolutely. Every lesson includes a dedicated Q&A discussion tab where you can post questions and receive direct responses from your course tutor within 24 hours.',
    },
  ]

  const categories = ['All', 'Enrollment & Access', 'Payments', 'Live Classes', 'Certificates', 'Tutors & Support']

  const filtered = faqs.filter((f) => activeCategory === 'All' || f.category === activeCategory)

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, rgba(26, 64, 149, 0.05) 0%, rgba(40, 192, 244, 0.05) 100%)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-[#28C0F4] mb-2">Help Center</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Frequently Asked Questions
          </h1>
          <p className="text-gray-500 text-sm">Everything you need to know about Digtech Academy programs, payments, and certificates.</p>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`text-xs px-4 py-2 rounded-full border font-bold transition-all ${
                activeCategory === c
                  ? 'bg-[#1A4095] text-white border-[#1A4095] shadow-sm'
                  : 'border-gray-200 text-gray-600 hover:bg-gradient-to-r hover:from-[#1A4095] hover:to-[#28C0F4] hover:text-white hover:border-transparent'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Accordion List */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {filtered.map((item, i) => (
            <div key={i} className="border-2 border-[#28C0F4]/20 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full text-left p-5 flex items-center justify-between font-bold text-sm text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-colors"
              >
                <span>{item.q}</span>
                <Icon
                  icon={openIndex === i ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                  className="w-5 h-5 text-[#1A4095] flex-shrink-0 ml-4"
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t-2 border-[#28C0F4]/10 pt-3 bg-gradient-to-r from-blue-50/30 to-cyan-50/30">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── UNIFIED AUTH PAGE (Single Login with Role Selector) ──────────────────────
function LoginPage({
  onLoginSuccess,
  setFrame,
  initialMode = 'login',
}: {
  onLoginSuccess: (email: string, role: string, name: string) => void
  setFrame: (f: Frame) => void
  initialMode?: 'login' | 'register' | 'reset'
}) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode)
  const [accountType, setAccountType] = useState<'student' | 'tutor' | 'principal' | 'admin'>('student')
  const [logoClickCount, setLogoClickCount] = useState(0)
  const [showAdminForm, setShowAdminForm] = useState(false)
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  
  // Register fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registerRole, setRegisterRole] = useState<'student' | 'tutor'>('student')
  const [tutorCourses, setTutorCourses] = useState<string[]>([])
  
  const AVAILABLE_COURSES = [
    'Python for Data Science & Machine Learning',
    'Full Stack Web Development with React & Node.js',
    'Digital Marketing & Social Media Strategy',
    'Cybersecurity Essentials for Professionals',
    'UI/UX Design Fundamentals with Figma',
    'Mobile App Development with Flutter',
    'Cloud Computing & DevOps',
    'Graphic Design & Branding',
    'Microsoft Office & Productivity',
    'Entrepreneurship & Digital Business',
  ]
  
  // Reset password fields
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Password strength calculator
  const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong' | 'very-strong', label: string, color: string } => {
    if (!password) return { strength: 'weak', label: '', color: '' }
    
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++
    
    if (score <= 2) return { strength: 'weak', label: 'Weak', color: '#EF4444' }
    if (score === 3) return { strength: 'medium', label: 'Medium', color: '#F59E0B' }
    if (score === 4) return { strength: 'strong', label: 'Strong', color: '#10B981' }
    return { strength: 'very-strong', label: 'Very Strong', color: '#059669' }
  }
  
  const passwordStrength = getPasswordStrength(regPassword)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string) => {
    const phoneRegex = /^(\+?256|0)?[7][0-9]{8}$/
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
  }

  const checkDuplicates = async (email: string, phone: string): Promise<string | null> => {
    try {
      // Check for duplicate email in Supabase users table
      const { data: emailCheck } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .limit(1)
      if (emailCheck && emailCheck.length > 0) {
        return 'This email is already registered. Please sign in instead.'
      }
      // Check for duplicate phone
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
      const { data: phoneCheck } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .limit(1)
      if (phoneCheck && phoneCheck.length > 0) {
        return 'This phone number is already registered. Please use a different number.'
      }
      return null
    } catch {
      return null // Don't block registration on network error
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!loginEmail || !loginPassword) {
      setError('Please fill in both email and password.')
      return
    }

    if (!validateEmail(loginEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    try {
      // Sign in with Supabase
      const { data, error: signInError } = await auth.signIn(loginEmail, loginPassword)
      
      if (signInError) {
        setError('Invalid email or password.')
        return
      }

      if (!data.user) {
        setError('Login failed. Please try again.')
        return
      }

      // Get user profile from database
      const { data: userData, error: userError } = await db.users.getById(data.user.id)
      
      if (userError || !userData) {
        setError('Unable to load user profile. Please contact support.')
        return
      }

      // Validate account type matches selected role
      if (userData.role !== accountType) {
        setError(`This email is registered as ${userData.role}. Please select the correct account type.`)
        // Sign out the user since role doesn't match
        await auth.signOut()
        return
      }

      // Check if account is active
      if (userData.status !== 'active') {
        setError(`Your account is ${userData.status}. Please contact support.`)
        await auth.signOut()
        return
      }

      // Update last login timestamp
      await db.users.update(data.user.id, { last_login: new Date().toISOString() })

      // Log the activity
      await logActivity(data.user.id, 'login', {
        role: userData.role,
        timestamp: new Date().toISOString()
      })

      setSuccess('Login successful! Redirecting...')
      setTimeout(() => {
        onLoginSuccess(userData.email, userData.role, userData.full_name)
      }, 800)
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate all fields
    if (!firstName || !lastName || !regEmail || !regPhone || !regPassword || !confirmPass) {
      setError('Please fill in all required fields.')
      return
    }

    // Validate names (at least 2 characters)
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError('First name and last name must be at least 2 characters.')
      return
    }

    // Validate email
    if (!validateEmail(regEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    // Validate phone
    if (!validatePhone(regPhone)) {
      setError('Invalid phone number. Use format: 0770123456')
      return
    }

    // Validate password strength
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!/[A-Z]/.test(regPassword) || !/[a-z]/.test(regPassword) || !/[0-9]/.test(regPassword)) {
      setError('Password must contain uppercase, lowercase, and numbers.')
      return
    }

    // Check password match
    if (regPassword !== confirmPass) {
      setError('Passwords do not match.')
      return
    }

    try {
      // Check for duplicate email and phone in database
      const dupError = await checkDuplicates(regEmail, regPhone)
      if (dupError) {
        setError(dupError)
        return
      }

      // Sign up with Supabase Auth
      const { data, error: signUpError } = await auth.signUp(
        regEmail,
        regPassword,
        {
          full_name: `${firstName} ${lastName}`,
          phone: regPhone,
          role: registerRole,
        }
      )

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.')
        } else {
          setError(signUpError.message || 'Registration failed. Please try again.')
        }
        return
      }

      if (!data.user) {
        setError('Registration failed. Please try again.')
        return
      }

      // Insert user profile into database
      const { error: insertError } = await db.users.create({
        id: data.user.id,
        email: regEmail,
        full_name: `${firstName} ${lastName}`,
        phone: regPhone,
        role: registerRole,
        status: 'active',
        ...(registerRole === 'tutor' && tutorCourses.length > 0 ? { bio: `Teaches: ${tutorCourses.join(', ')}` } : {}),
      })

      if (insertError) {
        console.error('Profile creation error:', insertError)
        // Continue anyway since auth account is created
      }

      // Log the activity
      await logActivity(data.user.id, 'registration', {
        role: registerRole,
        timestamp: new Date().toISOString()
      })

      // Success
      setSuccess('Account created successfully! Redirecting to dashboard...')
      setTimeout(() => {
        onLoginSuccess(regEmail, registerRole, `${firstName} ${lastName}`)
      }, 1500)
    } catch (err) {
      console.error('Registration error:', err)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!validateEmail(resetEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    try {
      // Call Supabase password reset
      const { error: resetError } = await auth.resetPassword(resetEmail)
      
      if (resetError) {
        setError('Failed to send reset email. Please check the email address and try again.')
        console.error('Password reset error:', resetError)
        return
      }

      setResetSent(true)
      setSuccess('Password reset link sent! Check your email inbox.')
      
      // Track password reset attempt
      await logActivity('anonymous', 'password_reset_request', {
        email: resetEmail,
        timestamp: new Date().toISOString()
      })
      
      setTimeout(() => {
        setMode('login')
        setResetSent(false)
        setResetEmail('')
        setSuccess('')
      }, 3000)
    } catch (err) {
      console.error('Password reset error:', err)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-[#28C0F4]/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated blue background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#28C0F4]/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#1A4095]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="w-full max-w-md relative z-10 auth-container">
        {/* Logo */}
        <div className="text-center mb-6">
          <div 
            onClick={() => {
              const newCount = logoClickCount + 1
              setLogoClickCount(newCount)
              if (newCount === 5) {
                setShowAdminForm(true)
                setAccountType('admin')
                setMode('login')
                setLogoClickCount(0)
              }
            }}
            className="inline-block cursor-pointer"
          >
            <img src="/images/Digtech Academy Logo.png" alt="Digtech Academy" className="h-10 w-auto object-contain mx-auto hover:scale-105 transition-transform" />
          </div>
          {showAdminForm && (
            <p className="mt-2 text-xs font-bold text-[#1A4095] animate-fade-in-down">
              🔒 Admin Login Activated
            </p>
          )}
        </div>

        {/* Animated Container */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#28C0F4]/30 overflow-hidden auth-form-slide" style={{ boxShadow: '0 20px 60px rgba(40, 192, 244, 0.25), 0 0 40px rgba(26, 64, 149, 0.1)' }}>
          {/* Mode Toggle Tabs */}
          <div className="flex border-b border-[#28C0F4]/20 bg-gradient-to-r from-blue-50/50 to-[#28C0F4]/5">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 py-4 text-sm font-bold transition-all ${
                mode === 'login'
                  ? 'text-[#1A4095] border-b-2 border-[#1A4095] bg-blue-50/30'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon icon="lucide:log-in" className="w-4 h-4 inline mr-1.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 py-4 text-sm font-bold transition-all ${
                mode === 'register'
                  ? 'text-[#1A4095] border-b-2 border-[#1A4095] bg-blue-50/30'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon icon="lucide:user-plus" className="w-4 h-4 inline mr-1.5" />
              Register
            </button>
          </div>

          <div className="p-8">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 animate-fade-in-down">
                <Icon icon="lucide:alert-circle" className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2 animate-fade-in-down">
                <Icon icon="lucide:check-circle" className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <div className="animate-fade-in-up">
                <h2 className="text-xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Welcome Back
                </h2>
                <p className="text-xs text-gray-500 mb-6">Select your role and sign in to continue</p>

                {/* Role Selector Dropdown */}
                {!showAdminForm && (
                <div className="mb-5">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Account Type</label>
                  <div className="relative">
                    <select
                      value={accountType}
                      onChange={(e) => {
                        setAccountType(e.target.value as 'student' | 'tutor' | 'principal' | 'admin')
                        setError('')
                      }}
                      className="w-full border-2 border-[#28C0F4]/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#28C0F4] focus:ring-2 focus:ring-[#28C0F4]/20 transition-all auth-input appearance-none bg-white cursor-pointer pr-10"
                    >
                      <option value="student">Student</option>
                      <option value="tutor">Tutor</option>
                      <option value="principal">Principal</option>
                    </select>
                    <Icon icon="lucide:chevron-down" className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="user@digtechacademy.ug"
                      className="w-full border-2 border-[#28C0F4]/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#28C0F4] focus:ring-2 focus:ring-[#28C0F4]/20 transition-all auth-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full border-2 border-[#28C0F4]/20 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-[#28C0F4] focus:ring-2 focus:ring-[#28C0F4]/20 transition-all auth-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A4095] transition-colors"
                      >
                        <Icon icon={showLoginPassword ? "lucide:eye-off" : "lucide:eye"} className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      className="font-bold text-[#1A4095] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all auth-button"
                    style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
                  >
                    Sign In to {accountType.charAt(0).toUpperCase() + accountType.slice(1)} Portal →
                  </button>
                </form>
              </div>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <div className="animate-fade-in-up">
                <h2 className="text-xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Create Account
                </h2>
                <p className="text-xs text-gray-500 mb-6">Join as a Student or Certified Tutor</p>

                {/* Role Selector: Student & Tutor only */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-5">
                  <button
                    type="button"
                    onClick={() => setRegisterRole('student')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      registerRole === 'student' ? 'bg-white text-[#1A4095] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <Icon icon="lucide:graduation-cap" className="w-4 h-4" /> Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisterRole('tutor')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      registerRole === 'tutor' ? 'bg-white text-[#1A4095] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <Icon icon="lucide:user-check" className="w-4 h-4" /> Tutor
                  </button>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">First Name *</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full border-2 border-[#28C0F4]/20 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#28C0F4] focus:ring-2 focus:ring-[#28C0F4]/20 transition-all auth-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full border-2 border-[#28C0F4]/20 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#28C0F4] focus:ring-2 focus:ring-[#28C0F4]/20 transition-all auth-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="john.doe@example.com"
                      className="w-full border-2 border-[#28C0F4]/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#28C0F4] focus:ring-2 focus:ring-[#28C0F4]/20 transition-all auth-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0770123456"
                      className="w-full border-2 border-[#28C0F4]/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#28C0F4] focus:ring-2 focus:ring-[#28C0F4]/20 transition-all auth-input"
                    />
                  </div>

                  {/* Tutor-Specific: Course Selection */}
                  {registerRole === 'tutor' && (
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                      <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <Icon icon="lucide:book-open" className="w-4 h-4 text-[#1A4095]" />
                        Select Courses You Can Teach *
                      </label>
                      <p className="text-[11px] text-gray-600 mb-3">Choose one or more courses you are qualified to teach</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {INITIAL_COURSES.map((course) => (
                          <label
                            key={course.id}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white transition-colors cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={tutorCourses.includes(course.title)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTutorCourses([...tutorCourses, course.title])
                                } else {
                                  setTutorCourses(tutorCourses.filter(c => c !== course.title))
                                }
                              }}
                              className="w-4 h-4 text-[#1A4095] border-gray-300 rounded focus:ring-[#28C0F4] focus:ring-2"
                            />
                            <div className="flex-1">
                              <div className="text-xs font-bold text-gray-900 group-hover:text-[#1A4095] transition-colors">
                                {course.title}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {course.category} • {course.level}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      {tutorCourses.length > 0 && (
                        <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Selected ({tutorCourses.length})</div>
                          <div className="flex flex-wrap gap-1.5">
                            {tutorCourses.map((course, idx) => (
                              <span key={idx} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">
                                {course}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Password *</label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 8 chars, uppercase, lowercase, numbers"
                        className="w-full border-2 border-[#28C0F4]/20 rounded-xl px-4 py-2.5 pr-12 text-sm outline-none focus:border-[#28C0F4] focus:ring-2 focus:ring-[#28C0F4]/20 transition-all auth-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A4095] transition-colors"
                      >
                        <Icon icon={showRegPassword ? "lucide:eye-off" : "lucide:eye"} className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {regPassword && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full transition-all duration-300"
                              style={{ 
                                width: passwordStrength.strength === 'weak' ? '25%' : 
                                       passwordStrength.strength === 'medium' ? '50%' : 
                                       passwordStrength.strength === 'strong' ? '75%' : '100%',
                                backgroundColor: passwordStrength.color
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold" style={{ color: passwordStrength.color }}>
                              {passwordStrength.label}
                            </span>
                            {(passwordStrength.strength === 'strong' || passwordStrength.strength === 'very-strong') && (
                              <Icon icon="lucide:check-circle" className="w-4 h-4" style={{ color: passwordStrength.color }} />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full border-2 border-[#28C0F4]/20 rounded-xl px-4 py-2.5 pr-12 text-sm outline-none focus:border-[#28C0F4] focus:ring-2 focus:ring-[#28C0F4]/20 transition-all auth-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A4095] transition-colors"
                      >
                        <Icon icon={showConfirmPassword ? "lucide:eye-off" : "lucide:eye"} className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!!success}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-60 auth-button"
                    style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
                  >
                    Create {registerRole.charAt(0).toUpperCase() + registerRole.slice(1)} Account
                  </button>

                  <p className="text-[11px] text-gray-500 text-center">
                    By registering, you agree to our Terms of Service and Privacy Policy
                  </p>
                </form>
              </div>
            )}

            {/* Password Reset Form */}
            {mode === 'reset' && (
              <div className="animate-fade-in-up">
                <h2 className="text-xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Reset Password
                </h2>
                <p className="text-xs text-gray-500 mb-6">
                  Enter your email and we'll send you a password reset link
                </p>

                {resetSent ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon icon="lucide:mail-check" className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">Check Your Email</p>
                    <p className="text-xs text-gray-500">We've sent a password reset link to {resetEmail}</p>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="user@digtechacademy.ug"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1A4095] focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all blue-btn-gradient-hover"
                      style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}
                    >
                      Send Reset Link
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="w-full text-xs text-gray-600 hover:text-gray-900 font-semibold"
                    >
                      ← Back to Sign In
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>Note: Admin and Principal accounts can only be created by existing Principals</p>
        </div>
      </div>
    </div>
  )
}

// Keep RegisterPage for backward compatibility (now just redirects to LoginPage in register mode)
function RegisterPage({
  onRegisterSuccess,
  setFrame,
}: {
  onRegisterSuccess: (email: string, role: string, name: string) => void
  setFrame: (f: Frame) => void
}) {
  // This function sets the initial mode to 'register' so users see the registration form immediately
  return <LoginPage onLoginSuccess={onRegisterSuccess} setFrame={setFrame} initialMode="register" />
}

// ─── ADMIN DASHBOARD (With Success Stories Manager) ───────────────────────────
function AdminDashboard({
  testimonials,
  setTestimonials,
  onLogout,
}: {
  testimonials: SuccessStory[]
  setTestimonials: React.Dispatch<React.SetStateAction<SuccessStory[]>>
  onLogout: () => void
}) {
  const [tab, setTab] = useState<'overview' | 'stories' | 'withdrawals' | 'profile'>('overview')
  
  // Profile & Photo Upload state for admin
  const [adminProfileImage, setAdminProfileImage] = useState('/images/liveclass3.png')
  const [adminImagePreview, setAdminImagePreview] = useState<string | null>(null)
  const [adminUploading, setAdminUploading] = useState(false)
  const [adminProfile, setAdminProfile] = useState({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@digitechacademy.ug',
    phone: '0770567890',
    bio: 'Administrator managing the academy platform and content.'
  })
  const [adminSuccessMessage, setAdminSuccessMessage] = useState('')
  
  // Photo upload function for admin
  const handleAdminImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    setAdminUploading(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setAdminImagePreview(result)
      
      setTimeout(() => {
        setAdminProfileImage(result)
        setAdminImagePreview(null)
        setAdminUploading(false)
        setAdminSuccessMessage('Profile picture updated successfully!')
        setTimeout(() => setAdminSuccessMessage(''), 3000)
      }, 1500)
    }
    reader.readAsDataURL(file)
  }
  const [newStoryName, setNewStoryName] = useState('')
  const [newStoryRole, setNewStoryRole] = useState('')
  const [newStoryText, setNewStoryText] = useState('')
  const [stats, setStats] = useState({ students: 0, tutors: 0, revenue: 0 })

  useEffect(() => {
    const loadStats = async () => {
      const { count: studentCount } = await db.users.getByRole('student')
      const { count: tutorCount } = await db.users.getByRole('tutor')
      const { data: enrollments } = await db.enrollments.getAll()
      const rev = enrollments?.reduce((sum: number, e: any) => sum + (Number(e.payment_amount) || 0), 0) || 0
      setStats({ students: studentCount || 0, tutors: tutorCount || 0, revenue: rev })
    }
    loadStats()
  }, [])

  const handleAddStory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStoryName || !newStoryText) return
    const newStoryData = {
      name: newStoryName,
      role: newStoryRole || 'Academy Graduate',
      text: newStoryText,
      avatar: '/images/liveclass1.png',
      rating: 5,
      is_active: true
    }
    
    try {
      const { data, error } = await db.testimonials.create(newStoryData)
      if (data && !error) {
        setTestimonials([data, ...testimonials])
        setNewStoryName('')
        setNewStoryRole('')
        setNewStoryText('')
      }
    } catch (err) {
      console.error('Failed to create testimonial', err)
      alert('Failed to save success story.')
    }
  }

  const handleDeleteStory = async (id: number) => {
    try {
      const { error } = await db.testimonials.delete(id)
      if (!error) {
        setTestimonials(testimonials.filter((t) => t.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete testimonial', err)
      alert('Failed to delete success story.')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)' }}>
      {/* Sidebar */}
      <aside className="w-64 flex flex-col sticky top-0 h-screen hidden md:flex p-5" style={{ background: 'linear-gradient(180deg, #1A4095 0%, #0d2556 100%)' }}>
        <div className="pb-4 border-b border-blue-400/20">
          <img src="/images/Digtech Academy Logo White.png" alt="Digtech Academy" className="h-8 w-auto object-contain" />
          <div className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mt-1">Admin Operations</div>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {[
            { id: 'overview', label: 'System Overview', icon: 'lucide:layout-dashboard' },
            { id: 'stories', label: 'Success Stories', icon: 'lucide:star' },
            { id: 'withdrawals', label: 'PesaPal Payouts', icon: 'lucide:banknote' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                tab === item.id ? 'bg-white/20 text-white shadow-lg backdrop-blur' : 'text-blue-200 hover:bg-white/10'
              }`}
            >
              <Icon icon={item.icon} className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 rounded-xl transition-all"
        >
          <Icon icon="lucide:log-out" className="w-4 h-4" /> Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {tab === 'overview' && (
          <div>
            <div className="bg-gradient-to-r from-[#1A4095] to-[#28C0F4] rounded-2xl p-6 mb-6 text-white shadow-lg">
              <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                System Analytics Overview
              </h1>
              <p className="text-blue-100 text-sm">Real-time performance metrics for DigiTech Academy</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Students', val: stats.students.toString(), color: '#1A4095', icon: 'lucide:users' },
                { label: 'Active Tutors', val: stats.tutors.toString(), color: '#28C0F4', icon: 'lucide:user-check' },
                { label: 'Revenue (PesaPal)', val: `UGX ${(stats.revenue).toLocaleString()}`, color: '#10B981', icon: 'lucide:banknote' },
                { label: 'Success Stories', val: `${testimonials.length}`, color: '#F59E0B', icon: 'lucide:star' },
              ].map((s) => (
                <div key={s.label} className="bg-white p-5 rounded-2xl border-2 border-blue-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.val}</div>
                    <Icon icon={s.icon} className="w-8 h-8 opacity-20" style={{ color: s.color }} />
                  </div>
                  <div className="text-xs text-gray-600 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'stories' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#1A4095] to-[#28C0F4] rounded-2xl p-6 text-white shadow-lg">
              <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Publish & Manage Student Success Stories
              </h1>
              <p className="text-blue-100 text-sm">Share inspiring student achievements with the world</p>
            </div>

            {/* Create Story Form */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Post New Student Testimonial</h3>
              <form onSubmit={handleAddStory} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={newStoryName}
                    onChange={(e) => setNewStoryName(e.target.value)}
                    placeholder="Student Full Name (e.g. Sandra Asiimwe)"
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                  />
                  <input
                    type="text"
                    value={newStoryRole}
                    onChange={(e) => setNewStoryRole(e.target.value)}
                    placeholder="Current Job / Company (e.g. Data Lead at SafeBoda)"
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                  />
                </div>
                <textarea
                  required
                  rows={3}
                  value={newStoryText}
                  onChange={(e) => setNewStoryText(e.target.value)}
                  placeholder="Write the full success story or testimonial..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-[#1A4095]"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#28C0F4] text-white font-bold text-xs hover:opacity-90 cursor-pointer shadow-sm"
                >
                  Publish Story to Homepage
                </button>
              </form>
            </div>

            {/* Stories List */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Published Testimonials ({testimonials.length})</h3>
              <div className="space-y-3">
                {testimonials.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <img src={t.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <div className="text-xs font-bold text-gray-900">{t.name}</div>
                        <div className="text-[11px] text-gray-500">{t.role}</div>
                        <p className="text-xs text-gray-600 mt-1 max-w-xl italic">"{t.text}"</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStory(t.id)}
                      className="text-xs text-red-500 font-bold hover:underline p-2"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'withdrawals' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4">PesaPal Payouts & Tutors Ledger</h2>
            <p className="text-xs text-gray-500">Connected to PesaPal API v3 (Live Environment).</p>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── PRINCIPAL DASHBOARD (Super Admin: Admin Management) ──────────────────────
function PrincipalDashboard({
  admins,
  setAdmins,
}: {
  admins: AdminUser[]
  setAdmins: React.Dispatch<React.SetStateAction<AdminUser[]>>
}) {
  const [tab, setTab] = useState<'admins' | 'tutors' | 'certs' | 'comments' | 'profile'>('admins')
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    if (tab === 'comments') {
      loadComments()
    }
  }, [tab])

  const loadComments = async () => {
    const { data } = await db.principalComments.getAll()
    if (data) setComments(data)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    const { data: userData } = await auth.getUser()
    if (!userData?.user) return
    await db.principalComments.create({ comment: newComment, created_by: userData.user.id, target_type: 'general' })
    setNewComment('')
    loadComments()
  }

  const handleDeleteComment = async (id: number) => {
    if (!confirm('Delete comment?')) return
    await db.principalComments.delete(id)
    loadComments()
  }
  
  // Profile & Photo Upload state for principal
  const [principalProfileImage, setPrincipalProfileImage] = useState('/images/liveclass2.png')
  const [principalImagePreview, setPrincipalImagePreview] = useState<string | null>(null)
  const [principalUploading, setPrincipalUploading] = useState(false)
  const [principalProfile, setPrincipalProfile] = useState({
    firstName: 'Principal',
    lastName: 'Admin',
    email: 'principal@digtechacademy.ug',
    phone: '0770789456',
    bio: 'Super admin overseeing all operations and administration.'
  })
  const [principalSuccessMessage, setPrincipalSuccessMessage] = useState('')
  // Photo upload function for principal
  const handlePrincipalImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    setPrincipalUploading(true)

    // Simulate upload process
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPrincipalImagePreview(result)
      
      // Simulate API call delay
      setTimeout(() => {
        setPrincipalProfileImage(result)
        setPrincipalImagePreview(null)
        setPrincipalUploading(false)
        setPrincipalSuccessMessage('Profile picture updated successfully!')
        setTimeout(() => setPrincipalSuccessMessage(''), 3000)
      }, 1500)
    }
    reader.readAsDataURL(file)
  }

  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [adminRole, setAdminRole] = useState('Course Operations Admin')

  useEffect(() => {
    const loadAdmins = async () => {
      const { data } = await db.users.getByRole('admin')
      if (data) {
        setAdmins(data.map((u: any) => ({
          id: u.id,
          name: u.full_name,
          email: u.email,
          phone: u.phone || '',
          role: u.role,
          createdAt: u.created_at
        })))
      }
    }
    loadAdmins()
  }, [setAdmins])

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminName || !adminEmail) return
    
    // Create auth user
    const { data: authData, error } = await auth.signUp(adminEmail, 'TempPass123!', { full_name: adminName, role: 'admin' })
    
    if (error) {
      alert('Error creating admin: ' + error.message)
      return
    }

    if (authData?.user) {
      const newAdmin = {
        id: authData.user.id,
        email: adminEmail,
        full_name: adminName,
        phone: adminPhone || '',
        role: 'admin',
        status: 'active'
      }
      
      await db.users.create(newAdmin)
      
      setAdmins([...admins, {
        id: newAdmin.id as any,
        name: newAdmin.full_name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        role: newAdmin.role,
        createdAt: new Date().toISOString()
      }])
    }

    setAdminName('')
    setAdminEmail('')
    setAdminPhone('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-100 p-5 hidden md:flex flex-col">
        <div className="pb-4 border-b border-gray-100">
          <img src="/images/Digtech Academy Logo.png" alt="Digtech Academy" className="h-8 w-auto object-contain" />
          <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mt-1">Super Admin / Principal</div>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {[
            { id: 'admins', label: 'Admin Accounts Provisioning', icon: 'lucide:shield-alert' },
            { id: 'tutors', label: 'Faculty & Tutors', icon: 'lucide:user-check' },
            { id: 'certs', label: 'Certificate Approvals', icon: 'lucide:award' },
            { id: 'profile', label: 'My Profile', icon: 'lucide:user' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left ${
                tab === item.id ? 'bg-[#1A4095] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon icon={item.icon} className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8">
        {tab === 'admins' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Principal Admin Provisioning Portal
            </h1>
            <p className="text-xs text-gray-500">
              Only the Principal (Super Admin) is authorized to create, configure, and deactivate Admin accounts.
            </p>

            {/* Create Admin Form */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Provision New Administrator</h3>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Admin Full Name"
                    className="border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-[#1A4095]"
                  />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin.name@digtechacademy.ug"
                    className="border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-[#1A4095]"
                  />
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+256 700 000 000"
                    className="border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-[#1A4095]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#1A4095] text-white font-bold text-xs hover:opacity-90"
                >
                  Create Admin Account
                </button>
              </form>
            </div>

            {/* List of Admins */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Configured Administrators ({admins.length})</h3>
              <div className="space-y-3">
                {admins.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                    <div>
                      <div className="text-xs font-bold text-gray-900">{a.name}</div>
                      <div className="text-[11px] text-gray-500">{a.email} • {a.phone}</div>
                      <Badge color="blue">{a.role}</Badge>
                    </div>
                    <span className="text-[11px] text-gray-400">Created: {a.createdAt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'comments' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4">Principal Directives & Comments</h2>
            <form onSubmit={handleAddComment} className="mb-6 flex gap-2">
              <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a new directive..." className="flex-1 p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1A4095]" />
              <button type="submit" className="px-6 py-3 bg-[#1A4095] text-white rounded-xl font-bold hover:opacity-90">Post</button>
            </form>
            <div className="space-y-4">
              {comments.map((c: any) => (
                <div key={c.id} className="p-4 border border-gray-200 rounded-xl flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{c.comment}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleDeleteComment(c.id)} className="text-red-500 hover:text-red-700"><Icon icon="lucide:trash-2" className="w-4 h-4" /></button>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No comments posted.</p>}
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Principal Profile Management
            </h1>
            <p className="text-xs text-gray-500">Manage your profile picture and personal information as Super Admin.</p>

            {principalSuccessMessage && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:check-circle" className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">{principalSuccessMessage}</span>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Profile Photo</h3>
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                        {principalImagePreview ? (
                          <img src={principalImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <img src={principalProfileImage} alt="Profile" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <input type="file" accept="image/*" onChange={handlePrincipalImageUpload} className="hidden" />
                        <div className="text-center">
                          <Icon icon="lucide:camera" className="w-8 h-8 text-white mx-auto mb-1" />
                          <span className="text-xs text-white font-bold">Change Photo</span>
                        </div>
                      </label>
                    </div>
                    {principalUploading && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin" />
                        Uploading image...
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">Click photo to upload (JPG/PNG, max 5MB)</p>
                    {principalProfileImage !== '/images/liveclass2.png' && (
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete your profile photo?")) {
                            setPrincipalProfileImage('/images/liveclass2.png')
                            setPrincipalSuccessMessage('Profile photo deleted successfully!')
                            setTimeout(() => setPrincipalSuccessMessage(''), 3000)
                          }
                        }}
                        className="mt-3 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                      >
                        <Icon icon="lucide:trash-2" className="w-3 h-3 mr-1 inline" />
                        Delete Photo
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 mb-1">Role</h4>
                      <div className="bg-blue-50 px-3 py-2 rounded-lg text-xs font-bold text-blue-700">Super Admin / Principal</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">First Name</label>
                      <input type="text" value={principalProfile.firstName} onChange={(e) => setPrincipalProfile({...principalProfile, firstName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Last Name</label>
                      <input type="text" value={principalProfile.lastName} onChange={(e) => setPrincipalProfile({...principalProfile, lastName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Email Address</label>
                      <input type="email" value={principalProfile.email} onChange={(e) => setPrincipalProfile({...principalProfile, email: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Phone Number</label>
                      <input type="tel" value={principalProfile.phone} onChange={(e) => setPrincipalProfile({...principalProfile, phone: e.target.value})} placeholder="0770789456" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Bio / About Me</label>
                    <textarea value={principalProfile.bio} onChange={(e) => setPrincipalProfile({...principalProfile, bio: e.target.value})} rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]" />
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => { setPrincipalSuccessMessage('Profile changes saved successfully!'); setTimeout(() => setPrincipalSuccessMessage(''), 3000) }} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all">
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── STUDENT & TUTOR DASHBOARDS & ABOUT & CONTACT ─────────────────────────────
// ─── USER PROFILE COMPONENT (Shared between Student & Tutor) ──────────────────
function UserProfile() {
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'student@digtechacademy.ug',
    phone: '0770123456',
    role: 'student',
    bio: 'Passionate learner exploring data science and web development.',
  })
  const [profileImage, setProfileImage] = useState('/images/liveclass3.png')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    setUploading(true)

    // Simulate upload process
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImagePreview(result)
      
      // Simulate API call delay
      setTimeout(() => {
        setProfileImage(result)
        setImagePreview(null)
        setUploading(false)
        setSuccessMessage('Profile picture updated successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      }, 1000)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = () => {
    // Validate phone number format
    const phoneRegex = /^(\+?256|0)?[7][0-9]{8}$/
    if (!phoneRegex.test(profile.phone.replace(/[\s\-\(\)]/g, ''))) {
      alert('Please enter a valid Ugandan phone number (e.g., 0770123456)')
      return
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profile.email)) {
      alert('Please enter a valid email address')
      return
    }

    // Validate names
    if (profile.firstName.trim().length < 2 || profile.lastName.trim().length < 2) {
      alert('First name and last name must be at least 2 characters each')
      return
    }

    setSuccessMessage('Profile updated successfully!')
    setEditing(false)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          My Profile
        </h2>
        <button
          onClick={() => editing ? handleSaveProfile() : setEditing(true)}
          className="text-xs font-bold px-4 py-2 rounded-xl bg-[#1A4095] text-white hover:opacity-90 transition-all"
        >
          {editing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2 animate-fade-in-down">
          <Icon icon="lucide:check-circle" className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Profile Photo Upload */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            )}
          </div>
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="text-center">
              <Icon icon="lucide:camera" className="w-8 h-8 text-white mx-auto mb-1" />
              <span className="text-xs text-white font-bold">Change Photo</span>
            </div>
          </label>
        </div>
        
        {uploading && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin" />
            Uploading image...
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">Click photo to upload (JPG/PNG, max 5MB)</p>
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            First Name
          </label>
          <input
            type="text"
            value={profile.firstName}
            onChange={(e) => setProfile({...profile, firstName: e.target.value})}
            disabled={!editing}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095] disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            Last Name
          </label>
          <input
            type="text"
            value={profile.lastName}
            onChange={(e) => setProfile({...profile, lastName: e.target.value})}
            disabled={!editing}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095] disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({...profile, email: e.target.value})}
            disabled={!editing}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095] disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            Phone Number
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({...profile, phone: e.target.value})}
            disabled={!editing}
            placeholder="0770123456"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095] disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
          Bio / About Me
        </label>
        <textarea
          value={profile.bio}
          onChange={(e) => setProfile({...profile, bio: e.target.value})}
          disabled={!editing}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095] disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      {editing && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                setSuccessMessage('Account deletion requested. Please contact support for final confirmation.')
                setTimeout(() => setSuccessMessage(''), 3000)
              }
            }}
            className="text-xs font-bold text-red-600 hover:text-red-800 px-4 py-2 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
          >
            <Icon icon="lucide:trash-2" className="w-3.5 h-3.5 inline mr-1.5" />
            Delete Account
          </button>
        </div>
      )}
    </div>
  )
}

function StudentDashboard({ setFrame, setSelectedExamId }: { setFrame: (f: Frame) => void, setSelectedExamId: (id: number) => void }) {
  const [activeTab, setActiveTab] = useState<'courses' | 'exams' | 'links'>('courses')
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [liveLinks, setLiveLinks] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { user } = await auth.getUser()
      if (!user) return

      // Load Enrollments
      const { data: enrolls } = await db.enrollments.getByStudent(user.id)
      setEnrollments(enrolls || [])

      if (enrolls && enrolls.length > 0) {
        const courseIds = enrolls.map((e: any) => e.course_id)
        
        // Load Live Links
        const { data: links } = await db.liveLinks.getAll()
        setLiveLinks(links?.filter((l: any) => courseIds.includes(l.course_id)) || [])

        // Load Exams
        const { data: exms } = await db.exams.getAll()
        setExams(exms?.filter((e: any) => courseIds.includes(e.course_id)) || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        Student Learning Portal
      </h1>
      <p className="text-xs text-gray-500 mb-8">Access your enrolled courses and manage your profile</p>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <UserProfile />
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setActiveTab('courses')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${activeTab === 'courses' ? 'text-[#1A4095] border-b-2 border-[#1A4095]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                My Courses
              </button>
              <button 
                onClick={() => setActiveTab('links')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${activeTab === 'links' ? 'text-[#1A4095] border-b-2 border-[#1A4095]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Live Classes
              </button>
              <button 
                onClick={() => setActiveTab('exams')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${activeTab === 'exams' ? 'text-[#1A4095] border-b-2 border-[#1A4095]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Exams
              </button>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
              ) : activeTab === 'courses' ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {enrollments.length > 0 ? enrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="border border-gray-200 p-4 rounded-xl">
                      <h3 className="font-bold text-gray-900 mb-1">{enrollment.courses?.title || 'Course'}</h3>
                      <p className="text-xs text-gray-500 mb-3">Status: {enrollment.status}</p>
                      <button 
                        onClick={() => {}} 
                        className="w-full text-center text-xs font-bold py-2 bg-[#1A4095] text-white rounded-lg hover:opacity-90"
                      >
                        Continue Learning
                      </button>
                    </div>
                  )) : (
                    <div className="col-span-2 text-center py-8 text-gray-500 text-sm">No courses enrolled yet.</div>
                  )}
                </div>
              ) : activeTab === 'links' ? (
                <div className="space-y-4">
                  {liveLinks.length > 0 ? liveLinks.map((link: any) => (
                    <div key={link.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{link.title}</h4>
                        <p className="text-xs text-gray-500">{link.courses?.title}</p>
                        <p className="text-[11px] text-[#28C0F4] mt-1">{link.link_type} • {link.scheduled_at ? new Date(link.scheduled_at).toLocaleString() : 'Always open'}</p>
                      </div>
                      <a href={link.url} target="_blank" rel="noreferrer" className="text-xs font-bold px-4 py-2 bg-[#28C0F4] text-white rounded-lg hover:bg-opacity-90">
                        Join Class
                      </a>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No active live classes.</div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {exams.length > 0 ? exams.map((exam: any) => (
                    <div key={exam.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{exam.title}</h4>
                        <p className="text-xs text-gray-500">{exam.courses?.title}</p>
                        <p className="text-[11px] text-gray-500 mt-1">{exam.duration_minutes} mins • {exam.total_marks} Marks</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedExamId(exam.id); setFrame('exam-player'); }}
                        className="text-xs font-bold px-4 py-2 bg-[#1A4095] text-white rounded-lg hover:opacity-90"
                      >
                        Take Exam
                      </button>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500 text-sm">No exams available.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExamPlayer({ examId, setFrame }: { examId: number, setFrame: (f: Frame) => void }) {
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadExam()
  }, [examId])

  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && exam && !submitted) {
      handleSubmit()
    }
  }, [timeLeft, submitted, exam])

  const loadExam = async () => {
    try {
      const { user } = await auth.getUser()
      if (!user) return setFrame('login')

      // Check if already submitted
      const { data: previousMarks } = await db.marks.getByStudent(user.id)
      const alreadyTaken = previousMarks?.find((m: any) => m.exam_id === examId)
      if (alreadyTaken) {
        setSubmitted(true)
        setError('You have already taken this exam.')
      }

      const { data: examsData } = await db.exams.getAll()
      const currentExam = examsData?.find((e: any) => e.id === examId)
      if (currentExam) {
        setExam(currentExam)
        setTimeLeft(currentExam.duration_minutes * 60)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers({ ...answers, [questionId]: val })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const { user } = await auth.getUser()
      if (!user) return

      let marksObtained = 0
      exam.questions?.forEach((q: any) => {
        if (q.type === 'mcq' || q.type === 'true-false') {
          if (answers[q.id] === q.correct_answer) {
            marksObtained += q.marks || 1
          }
        }
      })

      const grade = marksObtained >= exam.passing_marks ? 'Pass' : 'Fail'

      await db.marks.create({
        exam_id: exam.id,
        student_id: user.id,
        answers: answers,
        marks_obtained: marksObtained,
        grade: grade
      })
      
      setSubmitted(true)
      setError('')
    } catch (err: any) {
      console.error(err)
      setError('Failed to submit exam: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-12 text-center">Loading Exam...</div>

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon icon="lucide:check" className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Exam Completed</h2>
        <p className="text-gray-500 mb-8">{error || 'Your answers have been successfully submitted.'}</p>
        <button onClick={() => setFrame('student-dashboard')} className="px-6 py-3 bg-[#1A4095] text-white rounded-xl font-bold hover:bg-opacity-90">
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-4 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{exam?.title}</h1>
          <p className="text-sm text-gray-500">{exam?.courses?.title}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-1">Time Remaining</div>
          <div className={`text-2xl font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-[#1A4095]'}`}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {exam?.questions?.map((q: any, idx: number) => (
          <div key={q.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 text-sm">
              <span className="text-[#1A4095] mr-2">Q{idx + 1}.</span> {q.question}
              <span className="float-right text-xs text-gray-400 font-normal">{q.marks || 1} Marks</span>
            </h3>
            
            {q.type === 'mcq' && (
              <div className="space-y-2">
                {q.options?.map((opt: string, oIdx: number) => (
                  <label key={oIdx} className="flex items-center p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name={`q_${q.id}`} 
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleAnswerChange(q.id, opt)}
                      className="text-[#1A4095] focus:ring-[#1A4095]"
                    />
                    <span className="ml-3 text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}
            
            {q.type === 'true-false' && (
              <div className="flex space-x-4">
                {['True', 'False'].map(opt => (
                  <label key={opt} className="flex-1 flex items-center p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name={`q_${q.id}`} 
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleAnswerChange(q.id, opt)}
                      className="text-[#1A4095] focus:ring-[#1A4095]"
                    />
                    <span className="ml-3 text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'short-answer' && (
              <textarea 
                rows={4}
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-[#1A4095] outline-none"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <button onClick={() => setFrame('student-dashboard')} className="px-6 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
          Cancel Exam
        </button>
        <button 
          onClick={handleSubmit} 
          disabled={submitting}
          className="px-8 py-3 bg-[#28C0F4] text-white rounded-xl text-sm font-bold hover:bg-opacity-90 shadow-md shadow-[#28C0F4]/20 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Final Answers'}
        </button>
      </div>
    </div>
  )
}


function TutorDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'modules' | 'fees' | 'students' | 'exams' | 'marks' | 'certificates' | 'links' | 'profile'>('overview')
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [tutorId, setTutorId] = useState<string>('')
  const [tutorName, setTutorName] = useState<string>('Tutor')

  // Profile & Photo Upload state
  const [tutorProfileImage, setTutorProfileImage] = useState('/images/liveclass1.png')
  const [tutorImagePreview, setTutorImagePreview] = useState<string | null>(null)
  const [tutorUploading, setTutorUploading] = useState(false)
  const [tutorProfile, setTutorProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'tutor@digtechacademy.ug',
    phone: '0770123456',
    bio: 'Experienced educator passionate about technology and student success.'
  })
  const [tutorSuccessMessage, setTutorSuccessMessage] = useState('')
  
  // Photo upload function for tutors
  const handleTutorImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    setTutorUploading(true)

    // Simulate upload process
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setTutorImagePreview(result)
      
      // Simulate API call delay
      setTimeout(() => {
        setTutorProfileImage(result)
        setTutorImagePreview(null)
        setTutorUploading(false)
        setTutorSuccessMessage('Profile picture updated successfully!')
        setTimeout(() => setTutorSuccessMessage(''), 3000)
      }, 1500)
    }
    reader.readAsDataURL(file)
  }

  // Modules state
  const [modules, setModules] = useState<any[]>([])
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [editingModule, setEditingModule] = useState<any>(null)
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleDescription, setModuleDescription] = useState('')
  const [moduleOrder, setModuleOrder] = useState(1)

  // Students state
  const [enrollments, setEnrollments] = useState<any[]>([])

  // Exams state
  const [exams, setExams] = useState<any[]>([])
  const [showExamModal, setShowExamModal] = useState(false)
  const [editingExam, setEditingExam] = useState<any>(null)
  const [examTitle, setExamTitle] = useState('')
  const [examDescription, setExamDescription] = useState('')
  const [examTotalMarks, setExamTotalMarks] = useState(100)
  const [examDate, setExamDate] = useState('')

  // Marks state
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [markEntries, setMarkEntries] = useState<Record<string, number>>({})

  // Live Links state
  const [liveLinks, setLiveLinks] = useState<any[]>([])
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [editingLink, setEditingLink] = useState<any>(null)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkType, setLinkType] = useState<'google-meet' | 'zoom' | 'youtube' | 'other'>('google-meet')
  const [linkSchedule, setLinkSchedule] = useState('')

  // Fee editing state
  const [editingFeeId, setEditingFeeId] = useState<number | null>(null)
  const [editingFeeValue, setEditingFeeValue] = useState('')

  useEffect(() => { loadTutorData() }, [])

  const loadTutorData = async () => {
    try {
      const { user } = await auth.getUser()
      if (user) {
        setTutorId(user.id)
        const { data: userData } = await db.users.getById(user.id)
        if (userData) setTutorName(userData.full_name || user.email || 'Tutor')
        await loadCourses(user.id)
      }
    } catch (error) { console.error('Error loading tutor data:', error) } finally { setLoading(false) }
  }

  const loadCourses = async (userId: string) => {
    try {
      const { data, error } = await db.courses.getAll()
      if (error) { console.error(error); return }
      setCourses(data?.filter((c: any) => c.tutor_id === userId) || [])
    } catch (error) { console.error(error) }
  }

  // Module CRUD
  const loadModules = async (courseId: number) => { const { data } = await db.modules.getByCourse(courseId); setModules(data || []) }
  const openModuleModal = (mod?: any) => {
    if (mod) { setEditingModule(mod); setModuleTitle(mod.title); setModuleDescription(mod.description || ''); setModuleOrder(mod.sort_order || 1) }
    else { setEditingModule(null); setModuleTitle(''); setModuleDescription(''); setModuleOrder(modules.length + 1) }
    setShowModuleModal(true)
  }
  const saveModule = async () => {
    if (!moduleTitle.trim() || !selectedCourse) return
    const payload = { course_id: selectedCourse.id, title: moduleTitle, description: moduleDescription, sort_order: moduleOrder }
    if (editingModule) await db.modules.update(editingModule.id, payload); else await db.modules.create(payload)
    setShowModuleModal(false); loadModules(selectedCourse.id)
  }
  const deleteModule = async (id: number) => { 
    if (!confirm('Delete this module?')) return; 
    try {
      const { error } = await db.modules.delete(id); 
      if (error) throw error;
      if (selectedCourse) loadModules(selectedCourse.id);
    } catch (err: any) {
      alert('Failed to delete module: ' + err.message);
    }
  }

  // Enrollment helpers
  const loadEnrollments = async () => {
    const all: any[] = []
    for (const course of courses) { const { data } = await db.enrollments.getByCourse(course.id); if (data) all.push(...data.map((e: any) => ({ ...e, course_title: course.title }))) }
    setEnrollments(all)
  }
  const approveEnrollment = async (id: number) => { await db.enrollments.update(id, { status: 'enrolled', payment_status: 'PAID' }); loadEnrollments() }
  const removeEnrollment = async (id: number) => { 
    if (!confirm('Remove this student enrollment?')) return; 
    try {
      const { error } = await db.enrollments.delete(id); 
      if (error) throw error;
      loadEnrollments();
    } catch (err: any) {
      alert('Failed to remove enrollment: ' + err.message);
    }
  }

  // Exam CRUD with enhanced features
  const [examDuration, setExamDuration] = useState(60)
  const [examQuestions, setExamQuestions] = useState<any[]>([])
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false)
  const [examLink, setExamLink] = useState('')
  
  const loadExams = async () => {
    const all: any[] = []
    for (const course of courses) { const { data } = await db.exams.getByCourse(course.id); if (data) all.push(...data.map((e: any) => ({ ...e, course_title: course.title }))) }
    setExams(all)
  }
  
  const openExamModal = (exam?: any) => {
    if (exam) { 
      setEditingExam(exam)
      setExamTitle(exam.title)
      setExamDescription(exam.description || '')
      setExamTotalMarks(exam.total_marks || 100)
      setExamDate(exam.exam_date || '')
      setExamDuration(exam.duration_minutes || 60)
      setExamQuestions(exam.questions || [])
    } else { 
      setEditingExam(null)
      setExamTitle('')
      setExamDescription('')
      setExamTotalMarks(100)
      setExamDate('')
      setExamDuration(60)
      setExamQuestions([])
    }
    setShowExamModal(true)
  }
  
  const addQuestion = (type: 'mcq' | 'true-false' | 'short-answer') => {
    const newQuestion = {
      id: Date.now(),
      type,
      question: '',
      options: type === 'mcq' ? ['', '', '', ''] : [],
      correct_answer: '',
      marks: type === 'short-answer' ? 5 : 1
    }
    setExamQuestions([...examQuestions, newQuestion])
  }
  
  const updateQuestion = (id: number, field: string, value: any) => {
    setExamQuestions(examQuestions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }
  
  const deleteQuestion = (id: number) => {
    setExamQuestions(examQuestions.filter(q => q.id !== id))
  }
  
  const generateExamLink = (examId: number) => {
    const baseUrl = window.location.origin
    return `${baseUrl}/exam/${examId}`
  }
  
  const isExamExpired = (exam: any) => {
    if (!exam.exam_date || !exam.duration_minutes) return false
    const examStart = new Date(exam.exam_date).getTime()
    const examEnd = examStart + (exam.duration_minutes * 60 * 1000)
    return Date.now() > examEnd
  }
  
  const saveExam = async () => {
    if (!examTitle.trim() || !selectedCourse) return
    const payload = { 
      course_id: selectedCourse.id, 
      title: examTitle, 
      description: examDescription, 
      total_marks: examTotalMarks, 
      duration_minutes: examDuration,
      passing_marks: Math.floor(examTotalMarks * 0.5),
      questions: examQuestions,
      exam_date: examDate || null,
      status: 'published'
    }
    
    let examId
    if (editingExam) {
      await db.exams.update(editingExam.id, payload)
      examId = editingExam.id
    } else {
      const { data } = await db.exams.create(payload)
      examId = data?.id
    }
    
    if (examId) {
      setExamLink(generateExamLink(examId))
    }
    
    setShowExamModal(false)
    loadExams()
  }
  
  const deleteExam = async (id: number) => { 
    if (!confirm('Delete this exam?')) return
    try {
      const { error } = await db.exams.delete(id)
      if (error) throw error;
      loadExams()
    } catch (err: any) {
      alert('Failed to delete exam: ' + err.message);
    }
  }

  // Marks helpers with report generation
  const loadMarks = async (examId: number) => {
    const { data } = await db.marks.getByExam(examId)
    const entries: Record<string, number> = {}
    data?.forEach((m: any) => { entries[m.student_id] = m.marks_obtained })
    setMarkEntries(entries)
  }
  
  const saveMarks = async () => {
    if (!selectedExam) return
    for (const [studentId, score] of Object.entries(markEntries)) {
      await db.marks.upsert({ 
        exam_id: selectedExam.id, 
        student_id: studentId, 
        answers: {}, 
        marks_obtained: score, 
        grade: score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F' 
      })
    }
    alert('Marks saved successfully!')
    loadMarks(selectedExam.id)
  }
  
  // Report Generation
  const generateStudentReport = async (studentId: string) => {
    const { data: student } = await db.users.getById(studentId)
    const { data: marks } = await db.marks.getByStudent(studentId)
    const { data: enrollmentData } = await db.enrollments.getByStudent(studentId)
    
    const reportData = {
      student: student,
      enrollments: enrollmentData,
      marks: marks,
      totalExams: marks?.length || 0,
      averageScore: marks?.reduce((sum, m) => sum + m.marks_obtained, 0) / (marks?.length || 1),
      generatedAt: new Date().toISOString()
    }
    
    return reportData
  }
  
  const printReport = (reportData: any) => {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Report - ${reportData.student?.full_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #1A4095; border-bottom: 3px solid #28C0F4; padding-bottom: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #1A4095; color: white; }
          .summary { background: #f0f4ff; padding: 15px; border-radius: 8px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Digtech Academy</h1>
          <h2>Student Progress Report</h2>
        </div>
        <div class="section">
          <h3>Student Information</h3>
          <p><strong>Name:</strong> ${reportData.student?.full_name || 'N/A'}</p>
          <p><strong>Email:</strong> ${reportData.student?.email || 'N/A'}</p>
          <p><strong>Student ID:</strong> ${reportData.student?.id || 'N/A'}</p>
        </div>
        <div class="section summary">
          <h3>Performance Summary</h3>
          <p><strong>Total Exams:</strong> ${reportData.totalExams}</p>
          <p><strong>Average Score:</strong> ${reportData.averageScore.toFixed(2)}%</p>
          <p><strong>Report Generated:</strong> ${new Date(reportData.generatedAt).toLocaleString()}</p>
        </div>
        <div class="section">
          <h3>Exam Results</h3>
          <table>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Marks Obtained</th>
                <th>Grade</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.marks?.map((m: any) => `
                <tr>
                  <td>${m.exam?.title || 'N/A'}</td>
                  <td>${m.marks_obtained}</td>
                  <td>${m.grade}</td>
                  <td>${new Date(m.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('') || '<tr><td colspan="4">No exam results available</td></tr>'}
            </tbody>
          </table>
        </div>
        <button onclick="window.print()" style="background: #1A4095; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-top: 20px;">Print Report</button>
      </body>
      </html>
    `)
    printWindow.document.close()
  }
  
  // Certificate Generation
  const generateCertificate = async (studentId: string, courseId: number) => {
    const { data: student } = await db.users.getById(studentId)
    const { data: course } = await db.courses.getById(courseId)
    
    const certificateWindow = window.open('', '', 'width=1000,height=700')
    if (!certificateWindow) return
    
    certificateWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate of Completion</title>
        <style>
          body { font-family: 'Georgia', serif; padding: 60px; background: linear-gradient(135deg, #1A4095 0%, #28C0F4 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .certificate { background: white; padding: 60px; border: 20px solid #FFD700; border-radius: 20px; text-align: center; max-width: 800px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
          h1 { font-size: 48px; color: #1A4095; margin: 20px 0; font-weight: bold; }
          .subtitle { font-size: 24px; color: #28C0F4; margin: 10px 0; }
          .student-name { font-size: 36px; color: #1A4095; margin: 30px 0; font-weight: bold; text-decoration: underline; }
          .course-name { font-size: 28px; color: #333; margin: 20px 0; font-style: italic; }
          .date { margin-top: 40px; font-size: 18px; color: #666; }
          .signature { margin-top: 50px; display: flex; justify-content: space-around; }
          .signature-line { border-top: 2px solid #333; padding-top: 10px; width: 200px; }
          @media print { body { background: white; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="certificate">
          <h1>Certificate of Completion</h1>
          <div class="subtitle">This is to certify that</div>
          <div class="student-name">${student?.full_name || 'Student Name'}</div>
          <div class="subtitle">has successfully completed the course</div>
          <div class="course-name">${course?.title || 'Course Title'}</div>
          <div class="date">Issued on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div class="signature">
            <div class="signature-line">
              <strong>Director</strong><br/>Digtech Academy
            </div>
            <div class="signature-line">
              <strong>Instructor</strong><br/>${course?.tutor_name || 'Tutor'}
            </div>
          </div>
        </div>
        <button onclick="window.print()" style="position: fixed; bottom: 20px; right: 20px; background: #FFD700; color: #1A4095; padding: 15px 30px; border: none; border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">Print Certificate</button>
      </body>
      </html>
    `)
    certificateWindow.document.close()
  }
  
  // Student Activity Tracking
  const getStudentOnlineStatus = async () => {
    const { data: allStudents } = await db.users.getByRole('student')
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    
    return allStudents?.map((student: any) => ({
      ...student,
      isOnline: student.last_seen ? (now - new Date(student.last_seen).getTime()) < fiveMinutes : false,
      lastSeenText: student.last_seen ? formatLastSeen(new Date(student.last_seen)) : 'Never'
    })) || []
  }
  
  const formatLastSeen = (date: Date) => {
    const now = Date.now()
    const diff = now - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  // Live Links CRUD
  const loadLiveLinks = async () => {
    const all: any[] = []
    for (const course of courses) { const { data } = await db.liveLinks.getByCourse(course.id); if (data) all.push(...data.map((l: any) => ({ ...l, course_title: course.title }))) }
    setLiveLinks(all)
  }
  const openLinkModal = (link?: any) => {
    if (link) { setEditingLink(link); setLinkTitle(link.title); setLinkUrl(link.url); setLinkType(link.link_type || 'google-meet'); setLinkSchedule(link.scheduled_at || '') }
    else { setEditingLink(null); setLinkTitle(''); setLinkUrl(''); setLinkType('google-meet'); setLinkSchedule('') }
    setShowLinkModal(true)
  }
  const saveLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim() || !selectedCourse) return
    const payload = { course_id: selectedCourse.id, title: linkTitle, url: linkUrl, link_type: linkType, scheduled_at: linkSchedule || null }
    if (editingLink) await db.liveLinks.update(editingLink.id, payload); else await db.liveLinks.create(payload)
    setShowLinkModal(false); loadLiveLinks()
  }
  const deleteLink = async (id: number) => { 
    if (!confirm('Delete this link?')) return; 
    try {
      const { error } = await db.liveLinks.delete(id); 
      if (error) throw error;
      loadLiveLinks();
    } catch (err: any) {
      alert('Failed to delete link: ' + err.message);
    }
  }

  // Fee inline edit
  const saveFee = async (courseId: number) => {
    const newPrice = parseFloat(editingFeeValue)
    if (isNaN(newPrice) || newPrice < 0) { alert('Invalid price'); return }
    await db.courses.update(courseId, { price: newPrice }); setEditingFeeId(null); loadCourses(tutorId)
  }

  // Tab data loaders
  useEffect(() => {
    if (activeTab === 'modules' && selectedCourse) loadModules(selectedCourse.id)
    if (activeTab === 'students' && courses.length) loadEnrollments()
    if (activeTab === 'exams' && courses.length) loadExams()
    if (activeTab === 'links' && courses.length) loadLiveLinks()
  }, [activeTab, selectedCourse?.id])

  const handleCourseSuccess = () => { loadCourses(tutorId) }
  const handleEditCourse = (course: any) => { setEditingCourse(course); setShowCourseModal(true) }
  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return
    try { const { error } = await db.courses.delete(courseId); if (error) { alert('Failed: ' + error.message); return }; loadCourses(tutorId) } catch { alert('Failed to delete course') }
  }
  const handleCloseCourseModal = () => { setShowCourseModal(false); setEditingCourse(null) }

  const CourseSelector = ({ onChange }: { onChange?: () => void }) => (
    <div className="mb-6">
      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Select Course</label>
      <select value={selectedCourse?.id || ''} onChange={(e) => { const c = courses.find((c: any) => c.id === Number(e.target.value)); setSelectedCourse(c || null); onChange?.() }} className="w-full max-w-md border-2 border-blue-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-[#1A4095] focus:ring-2 focus:ring-blue-100 outline-none transition-all">
        <option value="">— Choose a course —</option>
        {courses.map((c: any) => (<option key={c.id} value={c.id}>{c.title}</option>))}
      </select>
    </div>
  )

  const totalStudents = enrollments.length
  const totalEarnings = courses.reduce((sum: number, c: any) => sum + ((c.price || 0) * (c.enrollments_count || 0)), 0)
  
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)' }}>
      {/* Top Header */}
      <div className="sticky top-0 z-40 shadow-sm" style={{ background: 'linear-gradient(135deg, #1A4095 0%, #28C0F4 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/images/Digtech Academy Logo White.png" alt="Digtech" className="h-10 w-auto" />
              <div>
                <div className="text-xs font-bold text-white">Tutor Dashboard</div>
                <div className="text-[10px] text-blue-100">Content & Student Management</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-white">Grace Nakato</div>
                <div className="text-[10px] text-blue-100">Verified Tutor</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold border-2 border-white/30">
                GN
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur border-b border-blue-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { id: 'overview', label: 'Overview', icon: 'lucide:layout-dashboard' },
              { id: 'courses', label: 'My Courses', icon: 'lucide:book-open' },
              { id: 'modules', label: 'Modules', icon: 'lucide:layers' },
              { id: 'fees', label: 'Fee Management', icon: 'lucide:dollar-sign' },
              { id: 'students', label: 'Students', icon: 'lucide:users' },
              { id: 'exams', label: 'Exams & Tests', icon: 'lucide:file-text' },
              { id: 'marks', label: 'Marks & Grades', icon: 'lucide:award' },
              { id: 'certificates', label: 'Certificates', icon: 'lucide:badge-check' },
              { id: 'links', label: 'Live Links', icon: 'lucide:video' },
              { id: 'profile', label: 'Profile', icon: 'lucide:user' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white shadow-lg'
                    : 'text-gray-600 hover:bg-blue-50'
                }`}
              >
                <Icon icon={tab.icon} className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#1A4095] to-[#28C0F4] rounded-2xl p-6 text-white shadow-lg">
              <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Welcome Back, Grace!
              </h1>
              <p className="text-sm text-blue-100">Here's what's happening with your courses today</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border-2 border-[#28C0F4]/30 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Icon icon="lucide:book-open" className="w-6 h-6 text-[#1A4095]" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-[#1A4095]">6</div>
                    <div className="text-xs text-gray-500">Active Courses</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-[#28C0F4]/30 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Icon icon="lucide:users" className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-green-600">548</div>
                    <div className="text-xs text-gray-500">Total Students</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-[#28C0F4]/30 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <Icon icon="lucide:clock" className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-yellow-600">12</div>
                    <div className="text-xs text-gray-500">Pending Approvals</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-[#28C0F4]/30 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Icon icon="lucide:dollar-sign" className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xl font-extrabold text-purple-600">12.5M</div>
                    <div className="text-xs text-gray-500">Total Earnings (UGX)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setActiveTab('courses')} className="p-4 rounded-xl border-2 border-[#28C0F4]/30 hover:bg-blue-50 transition-all">
                  <Icon icon="lucide:plus-circle" className="w-8 h-8 text-[#1A4095] mx-auto mb-2" />
                  <div className="text-xs font-bold text-gray-900">Create Course</div>
                </button>
                <button onClick={() => setActiveTab('modules')} className="p-4 rounded-xl border-2 border-[#28C0F4]/30 hover:bg-blue-50 transition-all">
                  <Icon icon="lucide:layers" className="w-8 h-8 text-[#1A4095] mx-auto mb-2" />
                  <div className="text-xs font-bold text-gray-900">Add Module</div>
                </button>
                <button onClick={() => setActiveTab('exams')} className="p-4 rounded-xl border-2 border-[#28C0F4]/30 hover:bg-blue-50 transition-all">
                  <Icon icon="lucide:file-plus" className="w-8 h-8 text-[#1A4095] mx-auto mb-2" />
                  <div className="text-xs font-bold text-gray-900">Create Exam</div>
                </button>
                <button onClick={() => setActiveTab('students')} className="p-4 rounded-xl border-2 border-[#28C0F4]/30 hover:bg-blue-50 transition-all">
                  <Icon icon="lucide:user-plus" className="w-8 h-8 text-[#1A4095] mx-auto mb-2" />
                  <div className="text-xs font-bold text-gray-900">Add Student</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  My Courses
                </h1>
                <p className="text-sm text-gray-500 mt-1">Manage your course content and settings</p>
              </div>
              <button 
                onClick={() => setShowCourseModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all"
              >
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Create New Course
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Icon icon="lucide:loader-2" className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-500">Loading your courses...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border-2 border-blue-100 text-center">
                <Icon icon="lucide:book-open" className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">No courses yet</h2>
                <p className="text-sm text-gray-500 mb-6">Create your first course to start teaching!</p>
                <button 
                  onClick={() => setShowCourseModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm"
                >
                  Create First Course
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl border-2 border-[#28C0F4]/30 overflow-hidden shadow-sm hover:shadow-lg transition-all group">
                    <div className="relative">
                      <img 
                        src={course.image_url || '/images/liveclass1.png'} 
                        alt={course.title} 
                        className="w-full h-40 object-cover" 
                      />
                      {course.status === 'draft' && (
                        <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Draft
                        </span>
                      )}
                      {course.status === 'published' && (
                        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Live
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Icon icon="lucide:users" className="w-3 h-3" />
                          {course.enrollments_count || 0} students
                        </span>
                        <span className="font-bold text-blue-600">
                          UGX {(course.price || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditCourse(course)}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#1A4095] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1"
                        >
                          <Icon icon="lucide:edit" className="w-3 h-3" />
                          Edit
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedCourse(course)
                            setActiveTab('modules')
                          }}
                          className="flex-1 py-2 px-3 rounded-lg border-2 border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-1"
                        >
                          <Icon icon="lucide:layers" className="w-3 h-3" />
                          Modules
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
                          className="py-2 px-3 rounded-lg border-2 border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-all"
                        >
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MODULES TAB ── */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Course Modules</h1>
                <p className="text-sm text-gray-500 mt-1">Create and manage sub-modules under each course</p>
              </div>
              <button
                onClick={() => openModuleModal()}
                disabled={!selectedCourse}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-40"
              >
                <Icon icon="lucide:plus" className="w-4 h-4" /> Add Module
              </button>
            </div>
            <CourseSelector onChange={() => selectedCourse && loadModules(selectedCourse.id)} />
            {!selectedCourse ? (
              <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center text-gray-400">
                <Icon icon="lucide:mouse-pointer-click" className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Select a course above to view its modules</p>
              </div>
            ) : modules.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
                <Icon icon="lucide:layers" className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800 mb-1">No modules yet</h3>
                <p className="text-sm text-gray-500">Click "Add Module" to create the first module for this course.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((mod: any) => (
                  <div key={mod.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-[#1A4095] font-bold text-sm">
                        {mod.order_index || '—'}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-900">{mod.title}</div>
                        {mod.description && <div className="text-xs text-gray-500 mt-0.5">{mod.description}</div>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openModuleModal(mod)} className="p-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all">
                        <Icon icon="lucide:edit" className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteModule(mod.id)} className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all">
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FEES TAB ── */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Fee Management</h1>
              <p className="text-sm text-gray-500 mt-1">View and update course fees inline</p>
            </div>
            {courses.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border text-center text-gray-400">No courses found.</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Course</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Fee (UGX)</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {courses.map((c: any) => (
                      <tr key={c.id} className="hover:bg-blue-50/30 transition-all">
                        <td className="px-5 py-3 font-medium text-gray-800">{c.title}</td>
                        <td className="px-5 py-3">
                          {editingFeeId === c.id ? (
                            <input
                              type="number"
                              value={editingFeeValue}
                              onChange={(e) => setEditingFeeValue(e.target.value)}
                              className="border border-blue-300 rounded-lg px-3 py-1 text-sm w-32 outline-none focus:border-[#1A4095]"
                            />
                          ) : (
                            <span className="font-bold text-blue-700">{(c.price || 0).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {c.status || 'draft'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {editingFeeId === c.id ? (
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => saveFee(c.id)} className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-all">Save</button>
                              <button onClick={() => setEditingFeeId(null)} className="px-3 py-1 rounded-lg border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-all">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingFeeId(c.id); setEditingFeeValue(String(c.price || 0)) }} className="px-3 py-1 rounded-lg border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition-all">
                              <Icon icon="lucide:edit-2" className="w-3 h-3 inline mr-1" />Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── STUDENTS TAB (Enhanced with Reports & Certificates) ── */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Enrolled Students</h1>
              <p className="text-sm text-gray-500 mt-1">View students, track activity, generate reports</p>
            </div>
            {enrollments.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border text-center">
                <Icon icon="lucide:users" className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800 mb-1">No students yet</h3>
                <p className="text-sm text-gray-500">Students who enroll in your courses will appear here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Student</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Course</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Payment</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Last Seen</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {enrollments.map((e: any) => (
                      <tr key={e.id} className="hover:bg-blue-50/30 transition-all">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${e.users?.last_seen && (Date.now() - new Date(e.users.last_seen).getTime() < 300000) ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                            <div>
                              <div className="font-medium text-gray-800">{e.users?.full_name || `Student #${e.student_id?.slice(-4)}`}</div>
                              <div className="text-xs text-gray-400">{e.users?.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{e.course_title || e.courses?.title || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.status === 'active' ? 'bg-green-100 text-green-700' : e.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {e.payment_status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">
                          {e.users?.last_seen ? formatLastSeen(new Date(e.users.last_seen)) : 'Never'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={async () => {
                                const report = await generateStudentReport(e.student_id)
                                printReport(report)
                              }} 
                              className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all"
                              title="Generate Report"
                            >
                              <Icon icon="lucide:file-text" className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => generateCertificate(e.student_id, e.course_id)} 
                              className="px-2 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all"
                              title="Generate Certificate"
                            >
                              <Icon icon="lucide:award" className="w-3.5 h-3.5" />
                            </button>
                            {e.payment_status !== 'paid' && (
                              <button 
                                onClick={() => approveEnrollment(e.id)} 
                                className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all"
                              >
                                Approve
                              </button>
                            )}
                            <button 
                              onClick={() => removeEnrollment(e.id)} 
                              className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── EXAMS TAB ── */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Exams & Assessments</h1>
                <p className="text-sm text-gray-500 mt-1">Create exams and track student submissions</p>
              </div>
              <button
                onClick={() => openExamModal()}
                disabled={!selectedCourse}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-40"
              >
                <Icon icon="lucide:plus" className="w-4 h-4" /> Create Exam
              </button>
            </div>
            <CourseSelector onChange={() => loadExams()} />
            {exams.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border text-center">
                <Icon icon="lucide:file-text" className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800 mb-1">No exams yet</h3>
                <p className="text-sm text-gray-500">Select a course and click "Create Exam" to add your first exam.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exams.map((exam: any) => {
                  const expired = isExamExpired(exam)
                  const examUrl = generateExamLink(exam.id)
                  
                  return (
                    <div key={exam.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-bold text-sm text-gray-900">{exam.title}</div>
                            {expired && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                Expired
                              </span>
                            )}
                            {!expired && exam.exam_date && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {exam.course_title || exam.courses?.title} · {exam.total_marks} marks · {exam.duration_minutes}min
                            {exam.questions?.length > 0 && ` · ${exam.questions.length} questions`}
                          </div>
                          {exam.exam_date && (
                            <div className="text-xs text-gray-400 mt-1">
                              <Icon icon="lucide:calendar" className="w-3 h-3 inline mr-1" />
                              Starts: {new Date(exam.exam_date).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { 
                              setSelectedExam(exam)
                              setActiveTab('marks') 
                            }} 
                            className="px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-50 transition-all"
                          >
                            <Icon icon="lucide:award" className="w-3 h-3 inline mr-1" />Marks
                          </button>
                          <button 
                            onClick={() => openExamModal(exam)} 
                            className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            <Icon icon="lucide:edit" className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteExam(exam.id)} 
                            className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Icon icon="lucide:trash-2" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Exam Link */}
                      {exam.questions?.length > 0 && (
                        <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="text-xs font-bold text-blue-900 mb-1.5">Student Exam Link:</div>
                          <div className="flex gap-2">
                            <input 
                              value={examUrl} 
                              readOnly 
                              className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 text-xs font-mono text-gray-700" 
                            />
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(examUrl)
                                alert('Exam link copied to clipboard!')
                              }} 
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-all"
                            >
                              <Icon icon="lucide:copy" className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MARKS TAB ── */}
        {activeTab === 'marks' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Marks & Grading</h1>
              <p className="text-sm text-gray-500 mt-1">Enter student marks per exam</p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Select Exam</label>
              <select
                value={selectedExam?.id || ''}
                onChange={(e) => {
                  const ex = exams.find((x: any) => x.id === Number(e.target.value))
                  setSelectedExam(ex || null)
                  if (ex) loadMarks(ex.id)
                }}
                className="w-full max-w-md border-2 border-blue-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-[#1A4095] outline-none"
              >
                <option value="">— Choose an exam —</option>
                {exams.map((ex: any) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
              </select>
            </div>
            {selectedExam && (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900">Marks for: <span className="text-[#1A4095]">{selectedExam.title}</span> (max {selectedExam.total_marks})</h3>
                {enrollments.filter((e: any) => e.status === 'active').length === 0 ? (
                  <p className="text-sm text-gray-500">No active students found. Approve student enrollments first.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {enrollments.filter((e: any) => e.status === 'active').map((enr: any) => (
                        <div key={enr.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{enr.users?.full_name || `Student #${enr.student_id?.slice(-4)}`}</div>
                            <div className="text-xs text-gray-400">{enr.users?.email}</div>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={selectedExam.total_marks}
                            value={markEntries[enr.student_id] || ''}
                            onChange={(e) => setMarkEntries({ ...markEntries, [enr.student_id]: Number(e.target.value) })}
                            placeholder="Score"
                            className="w-24 border-2 border-blue-200 rounded-xl px-3 py-1.5 text-sm font-bold text-center focus:border-[#1A4095] outline-none"
                          />
                          {markEntries[enr.student_id] !== undefined && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${markEntries[enr.student_id] >= 80 ? 'bg-green-100 text-green-700' : markEntries[enr.student_id] >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                              {markEntries[enr.student_id] >= 80 ? 'A' : markEntries[enr.student_id] >= 70 ? 'B' : markEntries[enr.student_id] >= 60 ? 'C' : markEntries[enr.student_id] >= 50 ? 'D' : 'F'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={saveMarks} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all">
                      <Icon icon="lucide:save" className="w-4 h-4 inline mr-2" />Save All Marks
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CERTIFICATES TAB ── */}
        {activeTab === 'certificates' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Certificate Management</h1>
              <p className="text-sm text-gray-500 mt-1">Issue certificates to students who completed and passed</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              {enrollments.filter((e: any) => e.status === 'active' || e.status === 'completed').length === 0 ? (
                <div className="text-center py-8">
                  <Icon icon="lucide:badge-check" className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No students eligible for certificates yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="text-left pb-3 text-xs font-bold text-gray-500 uppercase">Student</th>
                      <th className="text-left pb-3 text-xs font-bold text-gray-500 uppercase">Course</th>
                      <th className="pb-3 text-xs font-bold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {enrollments.filter((e: any) => e.status === 'active' || e.status === 'completed').map((enr: any) => (
                      <tr key={enr.id} className="hover:bg-gray-50">
                        <td className="py-3 pr-4 font-medium text-gray-800">{enr.users?.full_name || `Student #${enr.student_id?.slice(-4)}`}</td>
                        <td className="py-3 pr-4 text-gray-600">{enr.course_title || enr.courses?.title || '—'}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => alert(`Certificate for ${enr.users?.full_name || 'student'} — PDF generation coming soon!`)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-xs font-bold hover:shadow-md transition-all"
                          >
                            <Icon icon="lucide:download" className="w-3 h-3 inline mr-1" />Issue Certificate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── LIVE LINKS TAB ── */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Live Class Links</h1>
                <p className="text-sm text-gray-500 mt-1">Add Google Meet, Zoom, or YouTube links for your classes</p>
              </div>
              <button
                onClick={() => openLinkModal()}
                disabled={!selectedCourse}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-40"
              >
                <Icon icon="lucide:plus" className="w-4 h-4" /> Add Link
              </button>
            </div>
            <CourseSelector onChange={() => loadLiveLinks()} />
            {liveLinks.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border text-center">
                <Icon icon="lucide:video" className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800 mb-1">No live links yet</h3>
                <p className="text-sm text-gray-500">Select a course and click "Add Link" to share a live class link with your students.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveLinks.map((link: any) => (
                  <div key={link.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold ${link.link_type === 'zoom' ? 'bg-blue-600' : link.link_type === 'youtube' ? 'bg-red-600' : 'bg-green-600'}`}>
                        <Icon icon={link.link_type === 'zoom' ? 'lucide:video' : link.link_type === 'youtube' ? 'lucide:youtube' : 'lucide:video'} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-900">{link.title}</div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#28C0F4] hover:underline truncate max-w-xs block">{link.url}</a>
                        {link.scheduled_at && <div className="text-xs text-gray-400 mt-0.5">Scheduled: {new Date(link.scheduled_at).toLocaleString()}</div>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openLinkModal(link)} className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all">
                        <Icon icon="lucide:edit" className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteLink(link.id)} className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all">
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MODULE MODAL ── */}
        {showModuleModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-lg font-extrabold text-gray-900">{editingModule ? 'Edit Module' : 'Create Module'}</h3>
              <input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="Module title *" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095]" />
              <textarea value={moduleDescription} onChange={(e) => setModuleDescription(e.target.value)} placeholder="Description (optional)" rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095]" />
              <input type="number" value={moduleOrder} onChange={(e) => setModuleOrder(Number(e.target.value))} placeholder="Order/Index" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095]" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModuleModal(false)} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={saveModule} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all">
                  {editingModule ? 'Update Module' : 'Create Module'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EXAM MODAL (Enhanced with Question Builder) ── */}
        {showExamModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 space-y-4 my-8">
              <h3 className="text-lg font-extrabold text-gray-900">{editingExam ? 'Edit Exam' : 'Create Exam'}</h3>
              
              <CourseSelector />
              
              <div className="grid md:grid-cols-2 gap-4">
                <input 
                  value={examTitle} 
                  onChange={(e) => setExamTitle(e.target.value)} 
                  placeholder="Exam title *" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095]" 
                />
                <input 
                  type="number" 
                  value={examDuration} 
                  onChange={(e) => setExamDuration(Number(e.target.value))} 
                  placeholder="Duration (minutes)" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095]" 
                />
              </div>
              
              <textarea 
                value={examDescription} 
                onChange={(e) => setExamDescription(e.target.value)} 
                placeholder="Description (optional)" 
                rows={2} 
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095]" 
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Total Marks</label>
                  <input 
                    type="number" 
                    value={examTotalMarks} 
                    onChange={(e) => setExamTotalMarks(Number(e.target.value))} 
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1A4095]" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Start Date/Time</label>
                  <input 
                    type="datetime-local" 
                    value={examDate} 
                    onChange={(e) => setExamDate(e.target.value)} 
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1A4095]" 
                  />
                </div>
              </div>
              
              {/* Question Builder */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-gray-900">Questions ({examQuestions.length})</h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => addQuestion('mcq')} 
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all"
                    >
                      + MCQ
                    </button>
                    <button 
                      onClick={() => addQuestion('true-false')} 
                      className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-all"
                    >
                      + True/False
                    </button>
                    <button 
                      onClick={() => addQuestion('short-answer')} 
                      className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-all"
                    >
                      + Short Answer
                    </button>
                  </div>
                </div>
                
                {examQuestions.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-xl text-center">
                    <Icon icon="lucide:help-circle" className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No questions added yet. Click buttons above to add questions.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {examQuestions.map((q, index) => (
                      <div key={q.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-bold text-gray-500">Question {index + 1} ({q.type})</span>
                          <button 
                            onClick={() => deleteQuestion(q.id)} 
                            className="text-red-500 hover:text-red-700"
                          >
                            <Icon icon="lucide:x" className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <input 
                          value={q.question} 
                          onChange={(e) => updateQuestion(q.id, 'question', e.target.value)} 
                          placeholder="Enter question text" 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2" 
                        />
                        
                        {q.type === 'mcq' && (
                          <div className="space-y-2">
                            {q.options.map((opt: string, i: number) => (
                              <input 
                                key={i}
                                value={opt} 
                                onChange={(e) => {
                                  const newOpts = [...q.options]
                                  newOpts[i] = e.target.value
                                  updateQuestion(q.id, 'options', newOpts)
                                }} 
                                placeholder={`Option ${String.fromCharCode(65 + i)}`} 
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs" 
                              />
                            ))}
                            <input 
                              value={q.correct_answer} 
                              onChange={(e) => updateQuestion(q.id, 'correct_answer', e.target.value)} 
                              placeholder="Correct answer (A, B, C, or D)" 
                              className="w-full border border-green-300 rounded-lg px-3 py-1.5 text-xs bg-green-50" 
                            />
                          </div>
                        )}
                        
                        {q.type === 'true-false' && (
                          <select 
                            value={q.correct_answer} 
                            onChange={(e) => updateQuestion(q.id, 'correct_answer', e.target.value)} 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="">Select correct answer</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        )}
                        
                        <div className="mt-2">
                          <label className="text-xs text-gray-500">Marks:</label>
                          <input 
                            type="number" 
                            value={q.marks} 
                            onChange={(e) => updateQuestion(q.id, 'marks', Number(e.target.value))} 
                            className="w-20 ml-2 border border-gray-300 rounded px-2 py-1 text-xs" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Exam Link Display */}
              {examLink && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <div className="text-xs font-bold text-blue-900 mb-1">Exam Link (Share with students):</div>
                  <div className="flex gap-2">
                    <input 
                      value={examLink} 
                      readOnly 
                      className="flex-1 bg-white border border-blue-300 rounded-lg px-3 py-2 text-xs font-mono" 
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(examLink)
                        alert('Link copied!')
                      }} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowExamModal(false)
                    setExamLink('')
                  }} 
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveExam} 
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all"
                >
                  {editingExam ? 'Update Exam' : 'Create Exam'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── LIVE LINK MODAL ── */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-lg font-extrabold text-gray-900">{editingLink ? 'Edit Live Link' : 'Add Live Link'}</h3>
              <CourseSelector />
              <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Link title (e.g. Monday Session)" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095]" />
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URL (Google Meet / Zoom / YouTube)" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095]" />
              <select value={linkType} onChange={(e) => setLinkType(e.target.value as any)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095] bg-white">
                <option value="google-meet">Google Meet</option>
                <option value="zoom">Zoom</option>
                <option value="youtube">YouTube Live</option>
                <option value="other">Other</option>
              </select>
              <input type="datetime-local" value={linkSchedule} onChange={(e) => setLinkSchedule(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1A4095]" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowLinkModal(false)} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={saveLink} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all">
                  {editingLink ? 'Update Link' : 'Add Link'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-[#1A4095] to-[#28C0F4] rounded-2xl p-6 text-white shadow-lg">
            <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Tutor Profile Management
            </h1>
            <p className="text-sm text-blue-100">Manage your profile picture and personal information</p>
          </div>

          {/* Success Message */}
          {tutorSuccessMessage && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:check-circle" className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800 font-medium">{tutorSuccessMessage}</span>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column: Profile Photo */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Profile Photo</h3>
                
                {/* Profile Photo Upload */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                      {tutorImagePreview ? (
                        <img src={tutorImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <img src={tutorProfileImage} alt="Profile" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleTutorImageUpload}
                        className="hidden"
                      />
                      <div className="text-center">
                        <Icon icon="lucide:camera" className="w-8 h-8 text-white mx-auto mb-1" />
                        <span className="text-xs text-white font-bold">Change Photo</span>
                      </div>
                    </label>
                  </div>
                  
                  {tutorUploading && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin" />
                      Uploading image...
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">Click photo to upload (JPG/PNG, max 5MB)</p>
                  
                  {/* Delete Photo Button */}
                  {tutorProfileImage !== '/images/liveclass1.png' && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete your profile photo?')) {
                          setTutorProfileImage('/images/liveclass1.png')
                          setTutorSuccessMessage('Profile photo deleted successfully!')
                          setTimeout(() => setTutorSuccessMessage(''), 3000)
                        }
                      }}
                      className="mt-3 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                    >
                      <Icon icon="lucide:trash-2" className="w-3 h-3 mr-1 inline" />
                      Delete Photo
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-1">Tutor ID</h4>
                    <div className="bg-gray-50 px-3 py-2 rounded-lg text-xs font-mono text-gray-600">TUT-{tutorId || '00123'}</div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-1">Verification Status</h4>
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:badge-check" className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-700 font-medium">Verified Tutor</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Profile Information */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Personal Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={tutorProfile.firstName}
                      onChange={(e) => setTutorProfile({...tutorProfile, firstName: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={tutorProfile.lastName}
                      onChange={(e) => setTutorProfile({...tutorProfile, lastName: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={tutorProfile.email}
                      onChange={(e) => setTutorProfile({...tutorProfile, email: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={tutorProfile.phone}
                      onChange={(e) => setTutorProfile({...tutorProfile, phone: e.target.value})}
                      placeholder="0770123456"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Bio / About Me
                  </label>
                  <textarea
                    value={tutorProfile.bio}
                    onChange={(e) => setTutorProfile({...tutorProfile, bio: e.target.value})}
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#1A4095]"
                  />
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setTutorSuccessMessage('Profile changes saved successfully!')
                        setTimeout(() => setTutorSuccessMessage(''), 3000)
                      }}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-sm hover:shadow-lg transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Form Modal */}
      {showCourseModal && (
        <CourseForm
          onClose={handleCloseCourseModal}
          onSuccess={handleCourseSuccess}
          editingCourse={editingCourse}
          tutorId={tutorId}
        />
      )}
    </div>
  )
}

function AboutPage({ setFrame }: { setFrame: (f: Frame) => void }) {
  const [typingText1, setTypingText1] = useState('')
  const [typingText2, setTypingText2] = useState('')
  const [typingText3, setTypingText3] = useState('')
  const [typingText4, setTypingText4] = useState('')

  const fullText1 = "Digtech Academy is Uganda's premier technology education institution, strategically located at Level 2 Grand West Arcade in the heart of Mbarara City. We are dedicated to transforming Africa's digital landscape by empowering the next generation of tech innovators, entrepreneurs, and industry leaders with cutting-edge skills and hands-on experience."
  
  const fullText2 = "Our comprehensive curriculum spans across multiple high-demand technology domains including Software Engineering, Data Science & Machine Learning, Cybersecurity, Cloud Computing, Mobile App Development, and Creative Digital Design. Each program is carefully crafted by industry experts and updated regularly to align with global technology trends and employer requirements."
  
  const fullText3 = "We believe in learning by doing. Our state-of-the-art facilities feature modern computer labs, collaborative workspaces, and industry-standard tools that mirror real-world professional environments. Students work on live projects, participate in hackathons, and engage with tech communities to build portfolios that demonstrate their capabilities to potential employers."
  
  const fullText4 = "Digtech Academy has successfully trained over 500+ students who now work at leading tech companies across East Africa and beyond. Our graduates have launched successful startups, secured remote positions with international firms, and contributed significantly to Uganda's growing technology sector. We partner with industry leaders to provide internship opportunities, mentorship programs, and career placement support to ensure our students transition smoothly from learning to earning."

  // Keyboard typing sound effect using Web Audio API
  const playTypingSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800 + Math.random() * 200 // Randomize for realistic effect
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.05)
  }

  // Typewriter effect for text 1 with sound
  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      if (index <= fullText1.length) {
        setTypingText1(fullText1.slice(0, index))
        if (index > 0 && fullText1[index - 1] !== ' ') {
          playTypingSound()
        }
        index++
      } else {
        clearInterval(interval)
      }
    }, 150)
    return () => clearInterval(interval)
  }, [])

  // Typewriter effect for text 2 (starts after text 1) with sound
  useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0
      const interval = setInterval(() => {
        if (index <= fullText2.length) {
          setTypingText2(fullText2.slice(0, index))
          if (index > 0 && fullText2[index - 1] !== ' ') {
            playTypingSound()
          }
          index++
        } else {
          clearInterval(interval)
        }
      }, 150)
      return () => clearInterval(interval)
    }, fullText1.length * 150 + 500)
    return () => clearTimeout(timeout)
  }, [])

  // Typewriter effect for text 3 with sound
  useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0
      const interval = setInterval(() => {
        if (index <= fullText3.length) {
          setTypingText3(fullText3.slice(0, index))
          if (index > 0 && fullText3[index - 1] !== ' ') {
            playTypingSound()
          }
          index++
        } else {
          clearInterval(interval)
        }
      }, 150)
      return () => clearInterval(interval)
    }, (fullText1.length + fullText2.length) * 150 + 1000)
    return () => clearTimeout(timeout)
  }, [])

  // Typewriter effect for text 4 with sound
  useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0
      const interval = setInterval(() => {
        if (index <= fullText4.length) {
          setTypingText4(fullText4.slice(0, index))
          if (index > 0 && fullText4[index - 1] !== ' ') {
            playTypingSound()
          }
          index++
        } else {
          clearInterval(interval)
        }
      }, 150)
      return () => clearInterval(interval)
    }, (fullText1.length + fullText2.length + fullText3.length) * 150 + 1500)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          About Digtech Academy
        </h1>
        <p className="text-lg text-[#28C0F4] font-semibold">
          Empowering Africa's Digital Future Through Technology Education
        </p>
      </div>

      {/* Who We Are */}
      <div className="mb-10 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold text-[#1A4095] mb-4 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <Icon icon="lucide:building-2" className="w-7 h-7" />
          Who We Are
        </h2>
        <p className="text-gray-700 text-sm leading-relaxed min-h-[120px]">
          {typingText1}
          <span className="animate-pulse">|</span>
        </p>
      </div>

      {/* What We Offer */}
      <div className="mb-10 bg-gradient-to-r from-cyan-50 to-blue-50 p-8 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold text-[#1A4095] mb-4 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <Icon icon="lucide:book-open" className="w-7 h-7" />
          What We Offer
        </h2>
        <p className="text-gray-700 text-sm leading-relaxed min-h-[120px]">
          {typingText2}
          <span className="animate-pulse">|</span>
        </p>
      </div>

      {/* Our Approach */}
      <div className="mb-10 bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold text-[#1A4095] mb-4 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <Icon icon="lucide:lightbulb" className="w-7 h-7" />
          Our Approach
        </h2>
        <p className="text-gray-700 text-sm leading-relaxed min-h-[120px]">
          {typingText3}
          <span className="animate-pulse">|</span>
        </p>
      </div>

      {/* Our Impact */}
      <div className="mb-10 bg-gradient-to-r from-amber-50 to-orange-50 p-8 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold text-[#1A4095] mb-4 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <Icon icon="lucide:trophy" className="w-7 h-7" />
          Our Impact & Success Stories
        </h2>
        <p className="text-gray-700 text-sm leading-relaxed min-h-[120px]">
          {typingText4}
          <span className="animate-pulse">|</span>
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border-2 border-[#28C0F4]/30">
          <div className="text-4xl font-extrabold text-[#1A4095] mb-2">500+</div>
          <div className="text-xs font-semibold text-gray-600 uppercase">Students Trained</div>
        </div>
        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border-2 border-[#28C0F4]/30">
          <div className="text-4xl font-extrabold text-[#1A4095] mb-2">15+</div>
          <div className="text-xs font-semibold text-gray-600 uppercase">Expert Tutors</div>
        </div>
        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border-2 border-[#28C0F4]/30">
          <div className="text-4xl font-extrabold text-[#1A4095] mb-2">50+</div>
          <div className="text-xs font-semibold text-gray-600 uppercase">Industry Partners</div>
        </div>
        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border-2 border-[#28C0F4]/30">
          <div className="text-4xl font-extrabold text-[#1A4095] mb-2">95%</div>
          <div className="text-xs font-semibold text-gray-600 uppercase">Job Placement Rate</div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-12 text-center bg-gradient-to-r from-[#1A4095] to-[#28C0F4] p-10 rounded-2xl shadow-xl">
        <h3 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Ready to Start Your Tech Journey?
        </h3>
        <p className="text-white/90 text-sm mb-6">
          Join hundreds of successful graduates who transformed their careers with Digtech Academy
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => setFrame('courses')}
            className="bg-white text-[#1A4095] px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg cursor-pointer hover:bg-[#28C0F4] hover:text-white"
          >
            Browse Courses
          </button>
          <button 
            onClick={() => setFrame('register')}
            className="bg-[#FFD700] text-[#1A4095] px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg cursor-pointer hover:bg-[#1A4095] hover:text-white"
          >
            Apply Now
          </button>
        </div>
      </div>
    </div>
  )
}

function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        Contact Digtech Academy
      </h1>
      <div className="contact-box-animated space-y-6 text-sm text-gray-700">
        <div className="text-center">
          <p className="font-bold text-lg text-[#1A4095] mb-2">Campus Location</p>
          <p>Level 2 Grand West Arcade</p>
          <p>High Street Mbarara City - Uganda</p>
          <a 
            href="https://maps.google.com/?q=Level+2+Grand+West+Arcade+Mbarara" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-[#28C0F4] hover:text-[#1A4095] font-semibold transition-colors"
          >
            <Icon icon="lucide:map-pin" className="w-4 h-4" />
            View on Map
          </a>
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-[#1A4095] mb-2">Phone</p>
          <a href="tel:+256770613201" className="text-[#28C0F4] hover:text-[#1A4095] font-semibold transition-colors">
            +256 (0) 770 613 201
          </a>
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-[#1A4095] mb-2">Email</p>
          <a href="mailto:info@digtechsolutionshub.com" className="text-[#28C0F4] hover:text-[#1A4095] font-semibold transition-colors">
            info@digtechsolutionshub.com
          </a>
        </div>
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="font-bold text-sm text-[#1A4095] mb-3">Connect With Us</p>
          <div className="flex justify-center gap-4">
            <a href="https://facebook.com/digtechacademy" target="_blank" rel="noopener noreferrer" className="text-[#28C0F4] hover:text-[#1A4095] transition-colors">
              <Icon icon="lucide:facebook" className="w-6 h-6" />
            </a>
            <a href="https://twitter.com/digtechacademy" target="_blank" rel="noopener noreferrer" className="text-[#28C0F4] hover:text-[#1A4095] transition-colors">
              <Icon icon="lucide:twitter" className="w-6 h-6" />
            </a>
            <a href="https://instagram.com/digtechacademy" target="_blank" rel="noopener noreferrer" className="text-[#28C0F4] hover:text-[#1A4095] transition-colors">
              <Icon icon="lucide:instagram" className="w-6 h-6" />
            </a>
            <a href="https://linkedin.com/company/digtechacademy" target="_blank" rel="noopener noreferrer" className="text-[#28C0F4] hover:text-[#1A4095] transition-colors">
              <Icon icon="lucide:linkedin" className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN APP COMPONENT ───────────────────────────────────────────────────────
export default function App() {
  const [frame, setFrame] = useState<Frame>('home')
  const [currentUser, setCurrentUser] = useState<{ email: string; role: string; name?: string } | null>(() => {
    const stored = sessionStorage.getItem('digtech_user')
    return stored ? JSON.parse(stored) : null
  })
  const [testimonials, setTestimonials] = useState<SuccessStory[]>(INITIAL_TESTIMONIALS)
  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS)
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false)
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<{ id: number; title: string } | undefined>(undefined)
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)

  // Fetch testimonials from Supabase on load
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data } = await db.testimonials.getAll()
        if (data && data.length > 0) {
          setTestimonials(data)
        }
      } catch (err) {
        console.warn('Failed to load testimonials, using fallback', err)
      }
    }
    fetchTestimonials()
  }, [])

  // Scroll to top whenever frame changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [frame])

  // Check for existing Supabase session on app load
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await auth.getSession()
      
      if (session?.user) {
        // Get user profile from database
        const { data: userData, error } = await db.users.getById(session.user.id)
        
        if (userData && !error) {
          const userObj = {
            email: userData.email,
            role: userData.role,
            name: userData.full_name
          }
          setCurrentUser(userObj)
          sessionStorage.setItem('digtech_user', JSON.stringify(userObj))
          
          // Update last login
          await db.users.update(session.user.id, { last_login: new Date().toISOString() })
        }
      } else {
        // If Supabase has no session, ensure we clear local state
        setCurrentUser(null)
        sessionStorage.removeItem('digtech_user')
      }
    }
    
    checkSession()
  }, [])

  // Prevent authenticated users from going back to login/register or home
  useEffect(() => {
    if (currentUser && ['login', 'register', 'home'].includes(frame)) {
      if (currentUser.role === 'admin') setFrame('admin-dashboard')
      else if (currentUser.role === 'tutor') setFrame('tutor-dashboard')
      else if (currentUser.role === 'principal') setFrame('principal-dashboard')
      else setFrame('student-dashboard')
    }
  }, [frame, currentUser])

  // Prevent unauthenticated users from accessing protected dashboards
  useEffect(() => {
    if (!currentUser && ['student-dashboard', 'tutor-dashboard', 'principal-dashboard', 'admin-dashboard'].includes(frame)) {
      setFrame('login')
    }
  }, [frame, currentUser])

  // Prevent logout on back button navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (currentUser) {
        e.preventDefault()
        // Stay on current dashboard
        window.history.pushState(null, '', window.location.href)
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    window.history.pushState(null, '', window.location.href)
    
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser])

  const handleLoginSuccess = (email: string, role: string, name: string) => {
    const userData = { email, role, name }
    sessionStorage.setItem('digtech_user', JSON.stringify(userData))
    setCurrentUser(userData)
    if (role === 'admin') setFrame('admin-dashboard')
    else if (role === 'tutor') setFrame('tutor-dashboard')
    else if (role === 'principal') setFrame('principal-dashboard')
    else setFrame('student-dashboard')
  }

  const handleLogout = async () => {
    // Sign out from Supabase
    await auth.signOut()
    sessionStorage.removeItem('digtech_user')
    setCurrentUser(null)
    setFrame('home')
  }

  const handleEnrollClick = (course?: { id: number; title: string; price?: number }) => {
    if (!currentUser) {
      alert('Please login to continue')
      setFrame('login')
      return
    }
    setSelectedCourseForEnrollment(course)
    setShowEnrollmentForm(true)
  }

  const handleEnrollmentSuccess = () => {
    setShowEnrollmentForm(false)
    setSelectedCourseForEnrollment(undefined)
  }

  const handleEnrollmentClose = () => {
    setShowEnrollmentForm(false)
    setSelectedCourseForEnrollment(undefined)
  }

  const isFullDashboard = ['admin-dashboard', 'principal-dashboard'].includes(frame)

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans">
      {!isFullDashboard && (
        <PublicNav
          frame={frame}
          setFrame={setFrame}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      <div className="flex-1">
        {frame === 'home' && <HomePage setFrame={setFrame} testimonials={testimonials} onEnroll={handleEnrollClick} />}
        {frame === 'courses' && <CoursesPage setFrame={setFrame} onEnroll={handleEnrollClick} />}
        {frame === 'course-detail' && <CourseDetailPage onEnroll={handleEnrollClick} />}
        {frame === 'live-courses' && <LiveCoursesPage onEnroll={handleEnrollClick} />}
        {frame === 'about' && <AboutPage setFrame={setFrame} />}
        {frame === 'contact' && <ContactPage />}
        {frame === 'faq' && <FaqPage />}
        {frame === 'login' && <LoginPage onLoginSuccess={handleLoginSuccess} setFrame={setFrame} />}
        {frame === 'register' && <RegisterPage onRegisterSuccess={handleLoginSuccess} setFrame={setFrame} />}
        {frame === 'admin-dashboard' && (
          <AdminDashboard
            testimonials={testimonials}
            setTestimonials={setTestimonials}
            onLogout={handleLogout}
          />
        )}
        {frame === 'principal-dashboard' && (
          <PrincipalDashboard admins={admins} setAdmins={setAdmins} />
        )}
        {frame === 'student-dashboard' && <StudentDashboard setFrame={setFrame} setSelectedExamId={setSelectedExamId} />}
        {frame === 'exam-player' && selectedExamId && <ExamPlayer examId={selectedExamId} setFrame={setFrame} />}
        {frame === 'tutor-dashboard' && <TutorDashboard />}
      </div>

      {!isFullDashboard && <Footer setFrame={setFrame} />}

      {/* Enrollment Form Modal with Mobile Money Payment Flow */}
      {showEnrollmentForm && (
        <EnrollmentForm
          onClose={handleEnrollmentClose}
          onSuccess={handleEnrollmentSuccess}
          preSelectedCourse={selectedCourseForEnrollment}
        />
      )}
    </div>
  )
}
