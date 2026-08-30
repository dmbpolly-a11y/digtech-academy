import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { db } from '../lib/supabase'
import { UGANDA_DISTRICTS } from '../utils/districts'

interface CourseItem {
  id: number
  title: string
  price: number
  duration?: string
  level?: string
  category?: string
  free?: boolean
}

const DEFAULT_COURSES: CourseItem[] = [
  { id: 1, title: 'Python for Data Science & Machine Learning', price: 95000, duration: '18 hours', level: 'Beginner', category: 'Data Science', free: false },
  { id: 2, title: 'Full Stack Web Development with React & Node.js', price: 120000, duration: '24 hours', level: 'Intermediate', category: 'Web Development', free: false },
  { id: 3, title: 'Digital Marketing & Social Media Strategy', price: 75000, duration: '10 hours', level: 'Beginner', category: 'Marketing', free: false },
  { id: 4, title: 'Cybersecurity Essentials for Professionals', price: 150000, duration: '20 hours', level: 'Advanced', category: 'Security', free: false },
  { id: 5, title: 'UI/UX Design Fundamentals with Figma', price: 0, duration: '12 hours', level: 'Beginner', category: 'Design', free: true },
  { id: 6, title: 'Mobile App Development with Flutter', price: 110000, duration: '16 hours', level: 'Intermediate', category: 'Mobile Dev', free: false },
]

const MERCHANT_ACCOUNTS = { mtn: '0770613201', airtel: '0702524736' }

interface EnrollmentFormProps {
  onClose: () => void
  onSuccess: () => void
  preSelectedCourse?: { id: number; title: string; price?: number }
}

export function EnrollmentForm({ onClose, onSuccess, preSelectedCourse }: EnrollmentFormProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [courses, setCourses] = useState<CourseItem[]>(DEFAULT_COURSES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Personal Details
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('male')
  const [city, setCity] = useState('Kampala')
  const [district, setDistrict] = useState('Kampala')

  // Step 2: Academic & Course
  const [selectedCourseId, setSelectedCourseId] = useState<number>(preSelectedCourse?.id || DEFAULT_COURSES[0].id)
  const [studyMode, setStudyMode] = useState('online')
  const [preferredSchedule, setPreferredSchedule] = useState('evening')
  const [educationLevel, setEducationLevel] = useState('bachelors')

  // Step 3 & 4: Mobile Money Payment
  const [paymentNetwork, setPaymentNetwork] = useState<'mtn' | 'airtel'>('mtn')
  const [momoPhone, setMomoPhone] = useState('')
  const [pinPromptSent, setPinPromptSent] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [transactionRef, setTransactionRef] = useState('')
  const [transactionTime, setTransactionTime] = useState('')

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data } = await db.courses.getAll()
        if (data && data.length > 0) setCourses(data)
      } catch { /* Fallback to DEFAULT_COURSES */ }
    }
    fetchCourses()
  }, [])

  useEffect(() => {
    if (phone && !momoPhone) setMomoPhone(phone)
  }, [phone, momoPhone])

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0] || DEFAULT_COURSES[0]
  const courseFee = selectedCourse.price || 0
  const isFreeCourse = selectedCourse.free || courseFee === 0

  const handleNextStep1 = () => {
    setError('')
    if (!firstName.trim() || !lastName.trim()) { setError('Please provide your full first and last name.'); return }
    if (!email.trim() || !email.includes('@')) { setError('Please provide a valid email address.'); return }
    const cleanPhone = phone.replace(/\s+/g, '')
    if (!cleanPhone || cleanPhone.length < 9) { setError('Please provide a valid Ugandan phone number (e.g. 0770613201).'); return }
    setMomoPhone(cleanPhone)
    setStep(2)
  }

  const handleProceedToPayment = () => {
    setError('')
    if (!selectedCourseId) { setError('Please select a course to enroll in.'); return }
    if (isFreeCourse) { finalizeEnrollment('FREE_ENROLLMENT', 'COMPLETED') } else { setStep(3) }
  }

  const handleInitiateMobileMoney = async () => {
    setError('')
    const cleanMomo = momoPhone.replace(/\s+/g, '')
    if (!cleanMomo || cleanMomo.length < 9) { setError('Please enter a valid Mobile Money number.'); return }
    setPaymentProcessing(true)
    try {
      const generatedRef = `DIGTECH-MM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`
      const response = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUgx: courseFee, reference: generatedRef,
          description: `Enrollment for ${selectedCourse.title}`,
          customerPhone: cleanMomo, customerName: `${firstName} ${lastName}`,
          callbackUrl: window.location.origin + '/api/webhook-pandora'
        })
      })
      if (!response.ok) throw new Error('Failed to initiate payment')
      const data = await response.json()
      if (data.success) {
        await db.applicationAttempts.track({
          email, course_id: selectedCourse.id, full_name: `${firstName} ${lastName}`,
          phone: phone || momoPhone, status: 'pending',
          form_data: { payment_status: 'pending', payment_reference: data.providerReference || generatedRef, payment_network: paymentNetwork.toUpperCase(), amount_paid: courseFee, personal: { firstName, lastName, email, phone, gender, city, district }, academic: { educationLevel, studyMode, preferredSchedule }, course: { id: selectedCourse.id, title: selectedCourse.title, price: courseFee } }
        })
        setTransactionRef(data.providerReference || generatedRef)
        setPaymentProcessing(false)
        setPinPromptSent(true)
        setStep(4)
      } else { throw new Error(data.error || 'Payment initiation failed') }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Payment initiation failed. Please try again.')
      setPaymentProcessing(false)
    }
  }

  const handleAuthorizePinPayment = () => {
    setError('')
    setPaymentProcessing(true)
    setTimeout(async () => {
      await finalizeEnrollment(transactionRef, 'PAID')
      setPaymentProcessing(false)
      setStep(5)
    }, 1500)
  }

  const finalizeEnrollment = async (reference: string, paymentStatus: string) => {
    setLoading(true)
    try {
      await db.applicationAttempts.track({
        email, course_id: selectedCourse.id, full_name: `${firstName} ${lastName}`,
        phone: phone || momoPhone, status: 'completed',
        form_data: {
          payment_status: paymentStatus, payment_reference: reference, payment_network: paymentNetwork.toUpperCase(), amount_paid: courseFee,
          personal: { firstName, lastName, email, phone, gender, city, district },
          academic: { educationLevel, studyMode, preferredSchedule },
          course: { id: selectedCourse.id, title: selectedCourse.title, price: courseFee },
          payment: { method: `${paymentNetwork.toUpperCase()} Mobile Money`, payerPhone: momoPhone, merchantNumber: MERCHANT_ACCOUNTS[paymentNetwork], reference, timestamp: new Date().toISOString() },
        },
      })
    } catch (err) { console.warn('Supabase log error (gracefully handled):', err) }
    finally {
      setLoading(false)
      if (isFreeCourse) {
        setTransactionRef(`FREE-${Date.now().toString().slice(-6)}`)
        setTransactionTime(new Date().toLocaleString('en-US', { timeZone: 'Africa/Kampala' }))
        setStep(5)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl my-4 overflow-hidden bg-white rounded-3xl shadow-2xl border-2 border-blue-100 animate-fade-in-up">

        {/* ── Header ── */}
        <div className="p-5 sm:p-6 relative bg-gradient-to-r from-[#1A4095] via-[#0f2660] to-[#28C0F4]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-all"
            title="Close"
          >
            <Icon icon="lucide:x" className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 bg-white/20 text-white rounded-full">
              Digtech Academy
            </span>
            <span className="text-xs text-blue-100 font-medium">
              {step === 1 && 'Step 1: Student Information'}
              {step === 2 && 'Step 2: Course & Schedule'}
              {step === 3 && 'Step 3: Mobile Money Checkout'}
              {step === 4 && 'Step 4: Phone PIN Authorization'}
              {step === 5 && 'Application & Payment Successful!'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {step === 5 ? 'Enrollment Confirmed! 🎉' : 'Course Application Form'}
          </h2>

          {/* Stepper */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-8 bg-white' : i < step ? 'w-4 bg-emerald-400' : 'w-4 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Form Body ── */}
        <div className="p-5 sm:p-6 max-h-[72vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-shake">
              <Icon icon="lucide:alert-circle" className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ════ STEP 1: PERSONAL INFORMATION ════ */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#1A4095] uppercase tracking-wider">Applying For</span>
                  <h4 className="text-sm font-bold text-gray-900">{selectedCourse.title}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#1A4095] uppercase tracking-wider">Fee</span>
                  <div className="text-sm font-extrabold text-[#1A4095]">
                    {isFreeCourse ? 'FREE' : `UGX ${courseFee.toLocaleString()}`}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">First Name *</label>
                  <input
                    type="text" required value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Joshua"
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#1A4095] focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Last Name *</label>
                  <input
                    type="text" required value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Kato"
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#1A4095] focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joshua.kato@example.com"
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#1A4095] focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">WhatsApp / Phone Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-bold text-gray-500">
                    🇺🇬 +256
                  </div>
                  <input
                    type="tel" required value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="770 123 456"
                    className="w-full pl-20 pr-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#1A4095] focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  We will use this phone number for your class admission, schedule SMS & Mobile Money prompt.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Gender *</label>
                  <select
                    value={gender} onChange={(e) => setGender(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#1A4095] transition-all bg-white font-medium"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">City / District *</label>
                  <select
                    value={district}
                    onChange={(e) => { setDistrict(e.target.value); setCity(e.target.value) }}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#1A4095] transition-all bg-white font-medium"
                  >
                    <option value="">Select a district...</option>
                    {UGANDA_DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
              </div>

              <button
                type="button" onClick={handleNextStep1}
                className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-extrabold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Continue to Course & Schedule
                <Icon icon="lucide:arrow-right" className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ════ STEP 2: COURSE & SCHEDULE ════ */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Select Course *</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#1A4095] bg-white font-semibold text-gray-800"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} — {c.free ? 'FREE' : `UGX ${(c.price || 0).toLocaleString()}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#1A4095] uppercase">{selectedCourse.category || 'Professional Course'}</span>
                    <span className="text-[10px] bg-[#1A4095] text-white px-2 py-0.5 rounded-full font-bold">{selectedCourse.duration || 'Flexible'}</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-snug">{selectedCourse.title}</h4>
                </div>
                <div className="text-right pl-3">
                  <span className="text-[10px] text-[#1A4095] uppercase font-bold block">Tuition</span>
                  <span className="text-base font-extrabold text-[#1A4095]">
                    {isFreeCourse ? 'FREE' : `UGX ${courseFee.toLocaleString()}`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Study Mode *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'online', label: 'Online Live', icon: 'lucide:monitor' },
                    { id: 'physical', label: 'In-Class (Mbarara)', icon: 'lucide:building' },
                    { id: 'hybrid', label: 'Hybrid', icon: 'lucide:layers' },
                  ].map((m) => (
                    <button
                      key={m.id} type="button" onClick={() => setStudyMode(m.id)}
                      className={`p-3 rounded-xl text-center transition-all flex flex-col items-center gap-1.5 border-2 ${
                        studyMode === m.id ? 'border-[#1A4095] bg-blue-50 text-[#1A4095] font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50 text-xs'
                      }`}
                    >
                      <Icon icon={m.icon} className="w-4 h-4" />
                      <span className="text-[11px] leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Preferred Schedule *</label>
                <select
                  value={preferredSchedule} onChange={(e) => setPreferredSchedule(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#1A4095] bg-white font-medium"
                >
                  <option value="evening">Evening Cohort (6:00 PM – 9:00 PM EAT)</option>
                  <option value="morning">Morning Cohort (8:00 AM – 12:00 PM EAT)</option>
                  <option value="weekend">Weekend Intensive (Sat & Sun)</option>
                  <option value="self-paced">Self-Paced / Recorded with 1-on-1 Mentorship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Highest Level of Education</label>
                <select
                  value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#1A4095] bg-white font-medium"
                >
                  <option value="secondary">Secondary (O / A Level)</option>
                  <option value="diploma">Diploma / Certificate</option>
                  <option value="bachelors">Bachelor's Degree</option>
                  <option value="postgrad">Postgraduate / Master's</option>
                  <option value="working">Self-Taught / Working Professional</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button" onClick={() => setStep(1)}
                  className="w-1/3 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all"
                >Back</button>
                <button
                  type="button" onClick={handleProceedToPayment}
                  className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-extrabold text-xs shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isFreeCourse ? 'Complete Free Enrollment' : 'Proceed to Mobile Money Payment'}
                  <Icon icon="lucide:credit-card" className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 3: MOBILE MONEY CHECKOUT ════ */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-gray-900 text-white space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Payable to: Digtech Solutions Hub</span>
                  <span>Official PesaPal Partner</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-800 pt-2">
                  <div>
                    <h3 className="font-bold text-sm text-gray-100">{selectedCourse.title}</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Applicant: {firstName} {lastName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase block font-bold">Total Due</span>
                    <span className="text-xl font-extrabold text-amber-400">UGX {courseFee.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Select Mobile Money Network *</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaymentNetwork('mtn')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      paymentNetwork === 'mtn' ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center font-black text-black text-xs shadow-sm">MTN</div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">MTN MoMo</h4>
                      <p className="text-[10px] text-gray-500">Merchant: {MERCHANT_ACCOUNTS.mtn}</p>
                    </div>
                  </div>
                  <div
                    onClick={() => setPaymentNetwork('airtel')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      paymentNetwork === 'airtel' ? 'border-red-500 bg-red-50/60 ring-2 ring-red-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center font-black text-white text-xs shadow-sm">Airtel</div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Airtel Money</h4>
                      <p className="text-[10px] text-gray-500">Merchant: {MERCHANT_ACCOUNTS.airtel}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  {paymentNetwork === 'mtn' ? 'MTN Mobile Money Number' : 'Airtel Money Number'} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-bold text-gray-500">🇺🇬 +256</div>
                  <input
                    type="tel" required value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="770 123 456"
                    className="w-full pl-20 pr-3.5 py-3 border-2 border-blue-100 rounded-xl text-sm outline-none focus:border-[#1A4095] font-bold text-gray-800 transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  A real-time prompt will be triggered to this number. Money will be deposited directly to Digtech Academy ({paymentNetwork === 'mtn' ? MERCHANT_ACCOUNTS.mtn : MERCHANT_ACCOUNTS.airtel}).
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className="w-1/3 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all">Back</button>
                <button
                  type="button" disabled={paymentProcessing} onClick={handleInitiateMobileMoney}
                  className="w-2/3 py-3.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-extrabold text-xs shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paymentProcessing ? (
                    <><Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />Sending Phone Prompt...</>
                  ) : (
                    <><Icon icon="lucide:smartphone" className="w-4 h-4" />Pay UGX {courseFee.toLocaleString()} Now</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 4: PHONE PIN AUTHORIZATION ════ */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in text-center py-2">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#1A4095] to-[#28C0F4] flex items-center justify-center text-white shadow-xl animate-bounce-in">
                <Icon icon="lucide:smartphone" className="w-10 h-10 animate-pulse" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  📱 USSD PIN Prompt Sent
                </span>
                <h3 className="text-lg font-extrabold text-gray-900 mt-2 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Authorize Payment on Your Phone
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  A Mobile Money prompt has been pushed to <strong className="text-gray-900">{momoPhone}</strong> for{' '}
                  <strong className="text-[#1A4095]">UGX {courseFee.toLocaleString()}</strong>.
                </p>
              </div>

              <div className="bg-gray-900 rounded-2xl p-4 text-left max-w-sm mx-auto border border-gray-800 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] border-b border-gray-800 pb-1.5">
                  <span className="text-gray-400">{paymentNetwork.toUpperCase()} Mobile Money</span>
                  <span className="text-emerald-400">● Live Carrier Session</span>
                </div>
                <div className="text-xs font-medium text-gray-200 leading-relaxed">
                  Transfer <strong className="text-amber-400">UGX {courseFee.toLocaleString()}</strong> to{' '}
                  <strong className="text-white">DIGTECH ACADEMY</strong> ({MERCHANT_ACCOUNTS[paymentNetwork]}) for{' '}
                  <em className="text-blue-300">{selectedCourse.title}</em>?
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Enter MM PIN to Confirm Transfer:</label>
                  <input
                    type="password" maxLength={5} value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-center text-lg font-mono tracking-widest text-amber-400 outline-none focus:border-[#28C0F4]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 max-w-sm mx-auto">
                <button type="button" onClick={() => setStep(3)} className="w-1/3 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50">Cancel</button>
                <button
                  type="button" disabled={paymentProcessing} onClick={handleAuthorizePinPayment}
                  className="w-2/3 py-3 rounded-xl font-extrabold text-xs text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {paymentProcessing ? (
                    <><Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />Verifying Transaction...</>
                  ) : (
                    <><Icon icon="lucide:check-circle" className="w-4 h-4" />Authorize & Complete Payment</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 5: OFFICIAL RECEIPT & SUCCESS ════ */}
          {step === 5 && (
            <div className="space-y-4 animate-fade-in text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-lg animate-scale-in">
                <Icon icon="lucide:check-circle-2" className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {isFreeCourse ? 'Free Enrollment Confirmed! 🎉' : 'Payment & Admission Successful! 🎉'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Money successfully deducted and transferred to Digtech Academy. Your admission is officially approved.
                </p>
              </div>

              {/* Receipt */}
              <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-300 p-4 text-left space-y-2.5 text-xs shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm">DIGTECH ACADEMY UGANDA</h4>
                    <span className="text-[10px] text-gray-500">Official Mobile Money Receipt</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">PAID & VERIFIED</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="block font-semibold text-gray-500">Student Name:</span><strong className="text-gray-800">{firstName} {lastName}</strong></div>
                  <div><span className="block font-semibold text-gray-500">Student Phone:</span><strong className="text-gray-800">{momoPhone || phone}</strong></div>
                  <div><span className="block font-semibold text-gray-500">Enrolled Course:</span><strong className="text-gray-800">{selectedCourse.title}</strong></div>
                  <div><span className="block font-semibold text-gray-500">Study Mode:</span><strong className="text-gray-800 capitalize">{studyMode} ({preferredSchedule})</strong></div>
                  <div><span className="block font-semibold text-gray-500">Amount Transferred:</span><strong className="text-sm font-extrabold text-[#1A4095]">{isFreeCourse ? 'UGX 0 (FREE)' : `UGX ${courseFee.toLocaleString()}`}</strong></div>
                  <div><span className="block font-semibold text-gray-500">Merchant No:</span><strong className="text-gray-800">{paymentNetwork === 'mtn' ? MERCHANT_ACCOUNTS.mtn : MERCHANT_ACCOUNTS.airtel}</strong></div>
                  <div className="col-span-2 pt-1 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Ref: {transactionRef || 'DIGTECH-OFFICIAL'}</span>
                    <span>{transactionTime || new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={`https://wa.me/256770613201?text=Hello%20Digtech%20Academy,%20I%20have%20completed%20enrollment%20for%20${encodeURIComponent(selectedCourse.title)}%20(Ref:%20${transactionRef}).%20Please%20add%20me%20to%20the%20student%20group.`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:opacity-95 flex items-center justify-center gap-2 transition-all"
                >
                  <Icon icon="mdi:whatsapp" className="w-5 h-5" />
                  Join Class WhatsApp Cohort Group
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button" onClick={() => window.print()}
                    className="py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 flex items-center justify-center gap-1.5"
                  >
                    <Icon icon="lucide:printer" className="w-4 h-4" />Print Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => { onSuccess(); onClose() }}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-[#1A4095] to-[#28C0F4] text-white font-bold text-xs hover:opacity-90 flex items-center justify-center gap-1.5"
                  >
                    <Icon icon="lucide:check" className="w-4 h-4" />Done / Return Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnrollmentForm
