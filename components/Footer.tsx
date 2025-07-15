export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-16">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <p className="text-sm">
          © {new Date().getFullYear()} matthew forrester wolffe, Richard Colwell Wolffe Jr.
        </p>
      </div>
    </footer>
  );
}