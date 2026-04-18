export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#1a1a2e] text-center py-8 px-4 mt-8">
      <p className="text-[#a9cce3] text-sm mb-1">
        Create, share, and experience duas in a beautiful, interactive way.
      </p>
      <p className="text-[#5d8aa8] text-xs">
        Created by Shareeza &amp; Shafeeza &copy; {year}
      </p>
    </footer>
  )
}
