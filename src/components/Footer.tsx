export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white text-center py-8 px-4 mt-8 border-t border-gray-100">
      <p className="text-[#1a5276] text-sm mb-1">
        Create, share, and experience duas in a beautiful, interactive way.
      </p>
      <p className="text-[#1a5276] text-xs opacity-60">
        Created by Shareeza &amp; Shafeeza &copy; {year}
      </p>
    </footer>
  )
}
