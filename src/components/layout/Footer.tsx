import { Link } from "react-router-dom";
import { Zap, Twitter, Github, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-gradient">
                CrowdSpark
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4">
              Making presentations interactive, one spark at a time.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/integrations" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Integrations
                </Link>
              </li>
              <li>
                <Link to="/templates" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Templates
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/tutorials" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Tutorials
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 CrowdSpark. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with ❤️ for interactive presentations
          </p>
        </div>
      </div>
    </footer>
  );
}
