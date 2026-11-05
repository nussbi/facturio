# DNS Configuration Guide for Facturio

## 🌐 DNS Setup Instructions

### Step 1: Get Your Server IP Address
First, you need to know your server's public IP address where you'll deploy Facturio.

```bash
# If you're on your server, run:
curl ifconfig.me
# Or
curl ipinfo.io/ip
```

### Step 2: Configure DNS Records
In your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.), add these A records:

```
Type    Name             Value               TTL
A       @                YOUR_SERVER_IP      300
A       www              YOUR_SERVER_IP      300  
A       app              YOUR_SERVER_IP      300
CNAME   api              app.facturio.ch     300
```

**Replace `YOUR_SERVER_IP` with your actual server IP address!**

### Step 3: Example DNS Zone File
If you're managing DNS yourself, here's the complete zone file:

```bind
$TTL 300
@       IN      SOA     ns1.your-provider.com. admin.facturio.ch. (
                        2025102301  ; Serial
                        3600        ; Refresh
                        1800        ; Retry
                        1209600     ; Expire
                        300         ; Minimum TTL
                        )

; Name servers (replace with your actual nameservers)
@       IN      NS      ns1.your-provider.com.
@       IN      NS      ns2.your-provider.com.

; A Records - Replace YOUR_SERVER_IP with your actual IP
@       IN      A       YOUR_SERVER_IP          ; facturio.ch
www     IN      A       YOUR_SERVER_IP          ; www.facturio.ch  
app     IN      A       YOUR_SERVER_IP          ; app.facturio.ch

; CNAME Records
api     IN      CNAME   app.facturio.ch.        ; api.facturio.ch

; Optional: Email records
@       IN      MX      10      mail.facturio.ch.
mail    IN      A       YOUR_SERVER_IP

; Optional: Security records
@       IN      TXT     "v=spf1 mx ~all"
@       IN      CAA     0 issue "letsencrypt.org"
@       IN      CAA     0 issuewild "letsencrypt.org"
```

### Step 4: Verify DNS Propagation
After setting up DNS, verify it's working:

```bash
# Check if DNS is resolving
nslookup facturio.ch
nslookup app.facturio.ch
nslookup www.facturio.ch

# Or use dig
dig facturio.ch
dig app.facturio.ch
```

### Step 5: Common DNS Providers Setup

#### Cloudflare
1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to DNS tab
4. Add these records:
   - Type: A, Name: @, Content: YOUR_SERVER_IP
   - Type: A, Name: www, Content: YOUR_SERVER_IP
   - Type: A, Name: app, Content: YOUR_SERVER_IP

#### Namecheap
1. Go to Domain List
2. Click "Manage" next to your domain
3. Go to "Advanced DNS" tab
4. Add the A records as shown above

#### GoDaddy
1. Go to DNS Management
2. Add A records for @, www, and app
3. Point all to your server IP

### Step 6: Wait for Propagation
DNS changes can take 5 minutes to 24 hours to propagate globally. 
You can check propagation status at: https://dnschecker.org

## 🚨 Important Notes

1. **Replace YOUR_SERVER_IP**: This must be your actual server's public IP
2. **TTL**: Set to 300 (5 minutes) initially for faster testing
3. **SSL**: Let's Encrypt will work once DNS is pointing correctly
4. **Cloudflare**: If using Cloudflare, set SSL to "Full" mode

## 🔧 Quick Test
Once DNS is configured, test with:
```bash
ping facturio.ch
ping app.facturio.ch
```

Both should return your server IP address.