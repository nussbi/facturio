import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { 
  Receipt, 
  BarChart3,
  CheckCircle,
  Users,
  Shield,
  ArrowRight,
  Star,
  Zap,
  Clock,
  Globe2,
  TrendingUp
} from "lucide-react";

// Force dynamic rendering for proper middleware routing
export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-3.5 w-3.5" />
              <span>Trusted by 1000+ Swiss businesses</span>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Professional invoicing.
              <span className="block mt-2 bg-gradient-to-r from-primary via-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Made simple.
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              Create beautiful invoices with Swiss QR-bills in minutes. From freelancers to growing teams, 
              Facturio gives you professional tools without the complexity.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="min-w-[200px] shadow-lg shadow-primary/25" asChild>
                <Link href="https://app.facturio.ch/login">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="min-w-[200px]" asChild>
                <Link href="#demo">
                  See Live Demo
                </Link>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Free forever • No credit card required
            </p>
          </div>
        </div>
      </section>


  {/* Why Choose Section */}
  <section id="features" className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Why Swiss businesses choose Facturio
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built for growth with features that scale with your business
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="group hover:shadow-md transition-shadow border-muted">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Built for Growth</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Freelancers, SMEs, and growing companies. Not just for single-person businesses.
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-md transition-shadow border-muted">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Better Value</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Starting from CHF 19/month with more features than competitors at CHF 30/month.
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-md transition-shadow border-muted">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Team Collaboration</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Multi-user accounts, permissions, and collaboration features built-in.
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-md transition-shadow border-muted">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Fully Customizable</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Complete template customization, branding, and unlimited flexibility.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-6 py-3 text-sm font-medium text-primary">
                <CheckCircle className="h-4 w-4" />
                <span>Starting from CHF 19/month • Start free forever</span>
              </div>
            </div>
          </div>
        </div>
      </section>      {/* Features Section */}
      <section className="w-full py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Everything you need to run your Swiss business
            </h2>
            <p className="text-lg text-muted-foreground">
              From your first invoice to scaling your team, Facturio adapts to your business needs
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            <Card className="text-center bg-card">
              <CardHeader>
                <Receipt className="mx-auto mb-4 h-12 w-12 text-primary" />
                <CardTitle>Swiss QR-Bills Made Easy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Generate compliant Swiss QR-bills automatically with every invoice. 
                  Support for multiple currencies and bank accounts.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-card">
              <CardHeader>
                <Users className="mx-auto mb-4 h-12 w-12 text-primary" />
                <CardTitle>Multi-User & Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Collaborate with your team, set permissions, and track who does what. 
                  Perfect for growing businesses and agencies.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-card">
              <CardHeader>
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-primary" />
                <CardTitle>Business Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advanced analytics, cash flow forecasting, and performance insights 
                  to help you make data-driven decisions.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Clock className="mx-auto mb-4 h-12 w-12 text-primary" />
                <CardTitle>Smart Automation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Automated payment reminders, recurring invoices, and expense categorization. 
                  Save hours every week.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Globe2 className="mx-auto mb-4 h-12 w-12 text-primary" />
                <CardTitle>Professional Branding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Fully customizable invoice templates, your logo, colors, and terms. 
                  Make every invoice reflect your brand.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-card">
              <CardHeader>
                <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
                <CardTitle>Swiss Data Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your data stays in Switzerland, encrypted and secure. 
                  Full GDPR compliance and Swiss privacy standards.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section id="pricing" className="w-full bg-muted/50 py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, pay as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            <Card className="bg-card">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Starter</CardTitle>
                <div className="text-3xl font-bold">Free</div>
                <CardDescription>Perfect for trying out</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Up to 5 invoices/month</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Swiss QR-bills included</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Basic expense tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Email support</span>
                </div>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link href="https://app.facturio.ch/login">Start Free</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary relative bg-card">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Professional</CardTitle>
                <div className="text-3xl font-bold">CHF 19<span className="text-lg font-normal">/month</span></div>
                <CardDescription>For growing businesses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Unlimited invoices</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Advanced analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Automated reminders</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Custom branding</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Priority support</span>
                </div>
                <Button className="w-full mt-6" asChild>
                  <Link href="https://app.facturio.ch/login">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Business</CardTitle>
                <div className="text-3xl font-bold">CHF 39<span className="text-lg font-normal">/month</span></div>
                <CardDescription>For teams and agencies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Everything in Professional</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Multi-user accounts</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Advanced permissions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>API access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Dedicated support</span>
                </div>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link href="https://app.facturio.ch/login">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* Demo Section */}
      <section id="demo" className="w-full py-16 bg-muted/50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              See Facturio in action
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Experience our powerful invoicing and business management tools firsthand
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="https://app.facturio.ch/login">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="https://app.facturio.ch/app/facturio-demo">
                  View Demo Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Trusted by Swiss businesses
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  &ldquo;Finally, an invoicing solution that grows with our agency. The team features and custom branding make us look professional.&rdquo;
                </p>
                <div className="text-sm font-medium">Sarah M., Design Agency</div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  &ldquo;When we hired our first employee, Facturio&rsquo;s multi-user support and permissions made team collaboration seamless.&rdquo;
                </p>
                <div className="text-sm font-medium">Thomas R., Consulting Firm</div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  &ldquo;The analytics dashboard gives me insights I never had before. I can finally see which clients are most profitable.&rdquo;
                </p>
                <div className="text-sm font-medium">Maria K., Freelance Developer</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-3xl font-bold">
              Ready to get started?
            </h2>
            <p className="mb-8 text-lg opacity-90">
              Join hundreds of Swiss businesses already using Facturio. 
              Start free today and grow your business with confidence.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="https://app.facturio.ch/login">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-4 text-sm opacity-75">
              Free forever • No credit card required
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}