import { Link } from 'react-router-dom'

export default function HomeButton() {
  return (
    <Link to="/" aria-label="Home" className="inline-block w-[24px] h-[24px] align-middle px-2 py-1">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6 text-white hover:text-white/70 transition"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    </Link>
  )
}
