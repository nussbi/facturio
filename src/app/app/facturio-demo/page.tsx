"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton, CardSkeleton, FormSkeleton } from "@/components/LoadingStates"
import { NetworkError, FormError, EmptyState, GenericError } from "@/components/ErrorStates"
import { AlertTriangle, CheckCircle, Info, Users } from "lucide-react"
import { useState } from "react"

export default function FacturioDemoPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    category: ""
  })

  const invoices = [
    { id: "INV-001", customer: "Acme Corp", amount: "CHF 1,250.00", status: "paid", date: "2024-10-01" },
    { id: "INV-002", customer: "TechStart GmbH", amount: "CHF 2,100.00", status: "pending", date: "2024-10-15" },
    { id: "INV-003", customer: "Global Solutions", amount: "CHF 850.00", status: "overdue", date: "2024-09-20" },
    { id: "INV-004", customer: "Swiss Consulting AG", amount: "CHF 3,500.00", status: "paid", date: "2024-10-10" },
    { id: "INV-005", customer: "Design Studio Zürich", amount: "CHF 1,750.00", status: "pending", date: "2024-10-18" },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Paid</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header matching actual app style */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facturio Interactive Demo</h1>
          <p className="text-muted-foreground mt-1">Experience the power and simplicity of modern Swiss invoicing - Try it now!</p>
        </div>
      </div>

      {/* Feature badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="bg-primary/5">Swiss QR-Bills</Badge>
        <Badge variant="outline" className="bg-primary/5">Multi-Currency</Badge>
        <Badge variant="outline" className="bg-primary/5">Beautiful UI</Badge>
      </div>

      {/* Button Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Buttons</CardTitle>
          <CardDescription>Different button styles and sizes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </CardContent>
      </Card>

      {/* Form Components */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Form Components</CardTitle>
          <CardDescription>Input fields, labels, and selects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea 
                id="message" 
                placeholder="Enter your message"
                className="min-h-[180px]"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button>Submit</Button>
            <Button variant="outline" onClick={() => setFormData({name: "", email: "", message: "", category: ""})}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table and Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Invoice Management</CardTitle>
          <CardDescription>Track and manage all your invoices in one place</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.customer}</TableCell>
                    <TableCell className="font-medium">{invoice.amount}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Example */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Dialog Component</CardTitle>
          <CardDescription>Modal dialogs for user interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new invoice for your customer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer Name</Label>
                  <Input id="customer" placeholder="Enter customer name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" placeholder="0.00" type="number" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button>Create Invoice</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Color System</CardTitle>
          <CardDescription>Your app&apos;s design tokens in action</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="w-full h-20 bg-primary rounded-md border"></div>
              <p className="text-sm font-medium">Primary</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-secondary rounded-md border"></div>
              <p className="text-sm font-medium">Secondary</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-accent rounded-md border"></div>
              <p className="text-sm font-medium">Accent</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-muted rounded-md border"></div>
              <p className="text-sm font-medium">Muted</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Loading States</CardTitle>
          <CardDescription>Skeleton components for loading states</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-sm font-medium mb-3">Table Loading</h3>
            <TableSkeleton rows={3} cols={4} />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3">Form Loading</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3">Card Loading</h3>
            <CardSkeleton />
          </div>
        </CardContent>
      </Card>

      {/* Error and Alert States */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Alerts & Error States</CardTitle>
          <CardDescription>Different types of alerts and error states</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Alerts</h3>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                This is an informational alert. Your invoice has been saved as draft.
              </AlertDescription>
            </Alert>
            
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                There was a problem processing your request. Please try again.
              </AlertDescription>
            </Alert>
            
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Your invoice has been sent successfully!
              </AlertDescription>
            </Alert>
          </div>
          
          <Separator />
          
          <div className="space-y-6">
            <h3 className="text-sm font-medium">Error States</h3>
            
            <NetworkError onRetry={() => alert('Retrying...')} />
            
            <FormError />
            
            <EmptyState 
              title="No customers found"
              description="You haven't added any customers yet. Create your first customer to get started."
              icon={Users}
              action={
                <Button>
                  Add Customer
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
