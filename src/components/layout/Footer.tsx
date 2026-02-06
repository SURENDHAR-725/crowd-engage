import { Link } from "react-router-dom";
import { Zap, Twitter, Github, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl btn-gradient flex items-center justify-center">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg sm:text-xl font-bold text-gradient">
                CrowdSpark
              </span>
            </Link>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4">
              Making presentations interactive, one spark at a time.
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              <a href="#" className="p-1.5 sm:p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-1.5 sm:p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="p-1.5 sm:p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold text-sm sm:text-base mb-3 sm:mb-4">Product</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/integrations" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Integrations
                </Link>
              </li>
              <li>
                <Link to="/templates" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Templates
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold text-sm sm:text-base mb-3 sm:mb-4">Resources</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/tutorials" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Tutorials
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold text-sm sm:text-base mb-3 sm:mb-4">Company</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            © 2024 CrowdSpark. All rights reserved.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
            Built with ❤️ for interactive presentations
          </p>
        </div>
      </div>
    </footer>
  );
}
