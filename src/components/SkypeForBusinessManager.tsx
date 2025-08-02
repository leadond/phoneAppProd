import React, { useState } from 'react';
import { 
  Users, 
  Phone, 
  Settings, 
  Monitor, 
  AlertTriangle,
  Plus,
  Search,
  Play,
  FileText,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';

interface SkypeUser {
  id: string;
  
  // Basic Information
  displayName: string;
  sipAddress: string;
  phoneNumber?: string;
  isKiosk: boolean;
  status: 'enabled' | 'disabled' | 'pending';
  lastSync?: string;
  
  // Active Directory Information
  employeeId: string;
  samAccountName: string;
  upn: string; // User Principal Name
  emailAddress: string;
  department: string;
  office: string;
  officePhone: string;
  departmentNumber: string;
  
  // Skype for Business Specific
  msRTCSIPLine: string; // Phone number in Skype
  msRTCSIPPrimaryAddress: string; // Primary SIP address
  proxyAddress: string[];
  targetAddress: string;
  isO365: boolean;
  
  // Extended Properties
  extension?: string;
  enterpriseVoiceEnabled: boolean;
  lineURI?: string;
  registrarPool?: string;
  voicePolicy?: string;
}

interface ResponseGroup {
  id: string;
  name: string;
  description: string;
  phoneNumber: string;
  sipAddress: string;
  status: 'active' | 'inactive' | 'pending';
  
  // Workflow Configuration
  workflowType: 'huntGroup' | 'interactive' | 'queue';
  language: string;
  timeZone: string;
  
  // Queue Settings
  queueName: string;
  queueDescription: string;
  timeoutThreshold: number; // seconds
  overflowThreshold: number; // number of calls
  overflowAction: 'disconnect' | 'voicemail' | 'redirect';
  overflowTarget?: string;
  timeoutAction: 'disconnect' | 'voicemail' | 'redirect';
  timeoutTarget?: string;
  
  // Agent Groups
  agentGroups: {
    name: string;
    routingMethod: 'longest-idle' | 'round-robin' | 'serial' | 'parallel';
    agents: string[];
    participationPolicy: 'informal' | 'formal';
  }[];
  
  // Business Hours
  businessHours: {
    enabled: boolean;
    schedule: {
      [key: string]: { // day of week
        enabled: boolean;
        startTime: string;
        endTime: string;
      };
    };
    holidaySchedule?: string;
  };
  
  // IVR Configuration
  ivr?: {
    enabled: boolean;
    welcomeMessage: string;
    menuOptions: {
      key: string;
      action: 'transfer' | 'queue' | 'disconnect';
      target?: string;
      announcement?: string;
    }[];
    invalidKeyRetryCount: number;
    noResponseRetryCount: number;
  };
  
  // Audio Settings
  audio: {
    musicOnHold?: string;
    welcomeMessage?: string;
    customMessages: {
      type: 'queue-wait' | 'overflow' | 'timeout' | 'business-hours';
      message: string;
    }[];
  };
  
  // Advanced Settings
  enableCallParkOrbit: boolean;
  enableConferencing: boolean;
  anonymousCallerAction: 'allow' | 'reject' | 'anonymous-only';
  enableCallDetailRecording: boolean;
  
  // Statistics
  statistics?: {
    totalCalls: number;
    averageWaitTime: number;
    abandonmentRate: number;
    lastUpdated: string;
  };
  
  created: string;
  lastModified: string;
  createdBy: string;
}

interface CommonAreaPhone {
  id: string;
  displayName: string;
  phoneNumber: string;
  location: string;
  macAddress?: string;
  status: 'online' | 'offline' | 'provisioning';
}

interface PowerShellScript {
  id: string;
  name: string;
  description: string;
  script: string;
  category: 'user' | 'responseGroup' | 'commonArea' | 'general';
}

export const SkypeForBusinessManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'extension' | 'employeeId' | 'username' | 'email'>('all');
  const [isExecutingScript, setIsExecutingScript] = useState(false);
  const [executionResults, setExecutionResults] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SkypeUser | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showLineURIForm, setShowLineURIForm] = useState(false);
  const [hasSearchedUsers, setHasSearchedUsers] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    phoneNumber: '',
    lineURI: ''
  });

  // Common Area Phone Management State
  const [commonAreaSearchTerm, setCommonAreaSearchTerm] = useState('');
  const [commonAreaSearchType, setCommonAreaSearchType] = useState<'all' | 'name' | 'number' | 'location'>('all');
  const [isSearchingCommonArea, setIsSearchingCommonArea] = useState(false);
  const [showAddCommonAreaForm, setShowAddCommonAreaForm] = useState(false);
  const [showResetPINForm, setShowResetPINForm] = useState(false);
  const [hasSearchedCommonArea, setHasSearchedCommonArea] = useState(false);
  const [showRemoveCommonAreaForm, setShowRemoveCommonAreaForm] = useState(false);
  const [selectedCommonAreaPhone, setSelectedCommonAreaPhone] = useState<CommonAreaPhone | null>(null);
  const [newCommonAreaPhone, setNewCommonAreaPhone] = useState({
    name: '',
    phoneNumber: ''
  });
  const [removeCommonAreaName, setRemoveCommonAreaName] = useState('');

  // No sample data - load real data from API/backend
  // NOTE: Phone numbers are integrated with the main phone number management database
  // Extensions are derived from the last 5 digits of the phone number
  const [skypeUsers, setSkypeUsers] = useState<SkypeUser[]>([]);

  const [responseGroups, setResponseGroups] = useState<ResponseGroup[]>([]);
  const [commonAreaPhones, setCommonAreaPhones] = useState<CommonAreaPhone[]>([]);

  const powershellScripts: PowerShellScript[] = [
    {
      id: '1',
      name: 'Enable Skype User',
      description: 'Enable a user for Skype for Business',
      category: 'user',
      script: `# Enable user for Skype for Business
Enable-CsUser -Identity "user@mdanderson.org" -RegistrarPool "fe19pool.mdanderson.edu" -SipAddressType EmailAddress
Set-CsUser -Identity "user@mdanderson.org" -EnterpriseVoiceEnabled $true`
    },
    {
      id: '2',
      name: 'Create Complete Response Group with Queue',
      description: 'Create a comprehensive response group with queue, agents, and business hours',
      category: 'responseGroup',
      script: `# Create Complete Response Group with Queue and Business Hours
# Import Required Module
Import-Module Lync

# Define Variables
$ServiceId = "service:ApplicationServer:fe19pool.mdanderson.edu"
$WorkflowName = "Customer Support"
$PrimaryUri = "sip:support@mdanderson.org"
$LineUri = "tel:+1XXXXXXXXXX"

# Create Agent Groups
$Agents1 = @("sip:john.doe@mdanderson.org", "sip:jane.smith@mdanderson.org")
$Agents2 = @("sip:senior.tech@mdanderson.org")

$AgentGroup1 = New-CsRgsAgentGroup -Parent $ServiceId -Name "Tier 1 Support" -AgentsByUri $Agents1 -RoutingMethod LongestIdle -ParticipationPolicy Formal
$AgentGroup2 = New-CsRgsAgentGroup -Parent $ServiceId -Name "Tier 2 Support" -AgentsByUri $Agents2 -RoutingMethod RoundRobin -ParticipationPolicy Formal

# Create Business Hours
$MonFri = New-CsRgsTimeRange -Name "WeekDays" -OpenTime "08:00" -CloseTime "17:00"
$BusinessHours = New-CsRgsHoursOfBusiness -Parent $ServiceId -Name "Support Hours" -MondayHours1 $MonFri -TuesdayHours1 $MonFri -WednesdayHours1 $MonFri -ThursdayHours1 $MonFri -FridayHours1 $MonFri

# Create Queue with Overflow and Timeout Settings
$Queue = New-CsRgsQueue -Parent $ServiceId -Name "Support Queue" -AgentGroupIDList @($AgentGroup1.Identity, $AgentGroup2.Identity) -TimeoutThreshold 180 -OverflowThreshold 10 -OverflowAction Voicemail -TimeoutAction Voicemail

# Create Audio Files (if available)
# $WelcomeMessage = Import-CsRgsAudioFile -Identity $ServiceId -FileName "welcome.wav" -Content (Get-Content C:\\AudioFiles\\welcome.wav -Encoding byte)
# $MusicOnHold = Import-CsRgsAudioFile -Identity $ServiceId -FileName "holdmusic.wav" -Content (Get-Content C:\\AudioFiles\\holdmusic.wav -Encoding byte)

# Create IVR with Menu Options
$MenuList = @()
$MenuPrompt = New-CsRgsPrompt -TextToSpeechPrompt "Press 1 for Technical Support, Press 2 for Billing, or stay on the line for general support"

# Technical Support Option
$TechAction = New-CsRgsCallAction -Action TransferToQueue -QueueID $Queue.Identity
$TechMenuOption = New-CsRgsMenuItem -DtmfResponse 1 -Action $TechAction -Prompt (New-CsRgsPrompt -TextToSpeechPrompt "Connecting to Technical Support")

# Billing Option
$BillingAction = New-CsRgsCallAction -Action TransferToUri -Uri "sip:billing@mdanderson.org"
$BillingMenuOption = New-CsRgsMenuItem -DtmfResponse 2 -Action $BillingAction -Prompt (New-CsRgsPrompt -TextToSpeechPrompt "Connecting to Billing")

$MenuList += $TechMenuOption
$MenuList += $BillingMenuOption

$Menu = New-CsRgsMenu -Name "Main Menu" -MenuList $MenuList -Prompt $MenuPrompt -EnableDisconnectOnFirstKeyPress $false

# Create Question and Answer for IVR
$Question = New-CsRgsQuestion -Prompt $MenuPrompt -AnswerList $MenuList -Name "MainQuestion" -NoAnswerPrompt (New-CsRgsPrompt -TextToSpeechPrompt "I didn't receive a response") -InvalidAnswerPrompt (New-CsRgsPrompt -TextToSpeechPrompt "Invalid selection, please try again")

# Create the Workflow
$Workflow = New-CsRgsWorkflow -Parent $ServiceId -Name $WorkflowName -PrimaryUri $PrimaryUri -LineUri $LineUri -DefaultAction (New-CsRgsCallAction -Action TransferToQueue -QueueID $Queue.Identity) -BusinessHoursID $BusinessHours.Identity -HolidayAction (New-CsRgsCallAction -Action Terminate) -NonBusinessHoursAction (New-CsRgsCallAction -Action Terminate) -Language "en-US" -TimeZone "Pacific Standard Time" -EnabledForFederation $false -Managed $true -ManagersByUri @("sip:admin@mdanderson.org") -Anonymous Allow

Write-Host "Response Group '$WorkflowName' created successfully!"
Write-Host "Primary URI: $PrimaryUri"
Write-Host "Line URI: $LineUri"
Write-Host "Agent Groups: $($AgentGroup1.Name), $($AgentGroup2.Name)"
Write-Host "Queue: $($Queue.Name)"
Write-Host "Business Hours: $($BusinessHours.Name)"`
    },
    {
      id: '3',
      name: 'Create Hunt Group Response Group',
      description: 'Create a simple hunt group without queue management',
      category: 'responseGroup',
      script: `# Create Hunt Group Response Group
# Import Required Module
Import-Module Lync

# Define Variables
$ServiceId = "service:ApplicationServer:fe19pool.mdanderson.edu"
$WorkflowName = "IT Help Desk"
$PrimaryUri = "sip:ithelp@mdanderson.org"
$LineUri = "tel:+1XXXXXXXXXX"

# Create Agent Group for Hunt Group
$Agents = @("sip:it.admin@mdanderson.org", "sip:it.tech1@mdanderson.org")
$AgentGroup = New-CsRgsAgentGroup -Parent $ServiceId -Name "IT Technicians" -AgentsByUri $Agents -RoutingMethod Parallel -ParticipationPolicy Informal

# Create Business Hours (Extended for IT)
$ExtendedHours = New-CsRgsTimeRange -Name "ExtendedHours" -OpenTime "07:00" -CloseTime "18:00"
$BusinessHours = New-CsRgsHoursOfBusiness -Parent $ServiceId -Name "IT Hours" -MondayHours1 $ExtendedHours -TuesdayHours1 $ExtendedHours -WednesdayHours1 $ExtendedHours -ThursdayHours1 $ExtendedHours -FridayHours1 $ExtendedHours

# Create Hunt Group (No Queue, Direct Transfer)
$HuntGroupAction = New-CsRgsCallAction -Action TransferToRgs -CallAction Hunt -AgentGroupIDList @($AgentGroup.Identity)

# Create the Hunt Group Workflow
$Workflow = New-CsRgsWorkflow -Parent $ServiceId -Name $WorkflowName -PrimaryUri $PrimaryUri -LineUri $LineUri -DefaultAction $HuntGroupAction -BusinessHoursID $BusinessHours.Identity -HolidayAction (New-CsRgsCallAction -Action Terminate) -NonBusinessHoursAction (New-CsRgsCallAction -Action Terminate) -Language "en-US" -TimeZone "Pacific Standard Time" -EnabledForFederation $false -Managed $true -ManagersByUri @("sip:it.admin@mdanderson.org") -Anonymous Reject

Write-Host "Hunt Group '$WorkflowName' created successfully!"
Write-Host "Primary URI: $PrimaryUri"
Write-Host "Line URI: $LineUri"
Write-Host "Agent Group: $($AgentGroup.Name) with $($Agents.Count) agents"
Write-Host "Routing Method: Parallel (Hunt Group)"`
    },
    {
      id: '4',
      name: 'Modify Response Group Queue Settings',
      description: 'Update queue timeout, overflow, and agent group settings',
      category: 'responseGroup',
      script: `# Modify Response Group Queue Settings
# Import Required Module
Import-Module Lync

# Define Variables
$ServiceId = "service:ApplicationServer:fe19pool.mdanderson.edu"
$WorkflowName = "Customer Support"
$QueueName = "Support Queue"

# Get Existing Workflow and Queue
$Workflow = Get-CsRgsWorkflow -Identity $ServiceId -Name $WorkflowName
$Queue = Get-CsRgsQueue -Identity $ServiceId -Name $QueueName

if ($Workflow -and $Queue) {
    # Update Queue Settings
    $Queue.TimeoutThreshold = 240  # 4 minutes
    $Queue.OverflowThreshold = 15  # 15 calls
    $Queue.OverflowAction = "Voicemail"
    $Queue.TimeoutAction = "Voicemail"
    
    # Apply Changes
    Set-CsRgsQueue -Instance $Queue
    
    # Update Workflow if needed
    $Workflow.Description = "Updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    Set-CsRgsWorkflow -Instance $Workflow
    
    Write-Host "Queue settings updated successfully!"
    Write-Host "New Timeout: $($Queue.TimeoutThreshold) seconds"
    Write-Host "New Overflow Threshold: $($Queue.OverflowThreshold) calls"
    Write-Host "Updated: $(Get-Date)"
} else {
    Write-Error "Workflow or Queue not found. Please check the names."
}`
    },
    {
      id: '5',
      name: 'Add Agents to Response Group',
      description: 'Add new agents to existing response group agent groups',
      category: 'responseGroup',
      script: `# Add Agents to Response Group
# Import Required Module
Import-Module Lync

# Define Variables
$ServiceId = "service:ApplicationServer:fe19pool.mdanderson.edu"
$AgentGroupName = "Tier 1 Support"
$NewAgents = @("sip:new.agent1@mdanderson.org", "sip:new.agent2@mdanderson.org")

# Get Existing Agent Group
$AgentGroup = Get-CsRgsAgentGroup -Identity $ServiceId -Name $AgentGroupName

if ($AgentGroup) {
    # Get current agents
    $CurrentAgents = $AgentGroup.AgentsByUri
    
    # Add new agents to existing list
    $UpdatedAgents = $CurrentAgents + $NewAgents
    
    # Remove duplicates
    $UpdatedAgents = $UpdatedAgents | Sort-Object | Get-Unique
    
    # Update the agent group
    $AgentGroup.AgentsByUri = $UpdatedAgents
    Set-CsRgsAgentGroup -Instance $AgentGroup
    
    Write-Host "Agents added successfully to '$AgentGroupName'!"
    Write-Host "Total agents now: $($UpdatedAgents.Count)"
    Write-Host "New agents added:"
    $NewAgents | ForEach-Object { Write-Host "  - $_" }
} else {
    Write-Error "Agent Group '$AgentGroupName' not found."
}`
    },
    {
      id: '6',
      name: 'Get Response Group Statistics',
      description: 'Retrieve call statistics and performance metrics for response groups',
      category: 'responseGroup',
      script: `# Get Response Group Statistics
# Import Required Module
Import-Module Lync

# Define Variables
$ServiceId = "service:ApplicationServer:fe19pool.mdanderson.edu"
$StartDate = (Get-Date).AddDays(-30)  # Last 30 days
$EndDate = Get-Date

# Get all Response Group Workflows
$Workflows = Get-CsRgsWorkflow -Identity $ServiceId

Write-Host "Response Group Statistics Report"
Write-Host "==============================="
Write-Host "Report Period: $($StartDate.ToString('yyyy-MM-dd')) to $($EndDate.ToString('yyyy-MM-dd'))"
Write-Host ""

foreach ($Workflow in $Workflows) {
    Write-Host "Workflow: $($Workflow.Name)"
    Write-Host "Primary URI: $($Workflow.PrimaryUri)"
    Write-Host "Line URI: $($Workflow.LineUri)"
    Write-Host "Status: $(if($Workflow.Active){'Active'}else{'Inactive'})"
    
    # Get Queue Information
    if ($Workflow.DefaultAction.QueueID) {
        $Queue = Get-CsRgsQueue -Identity $Workflow.DefaultAction.QueueID
        Write-Host "Queue: $($Queue.Name)"
        Write-Host "Timeout Threshold: $($Queue.TimeoutThreshold) seconds"
        Write-Host "Overflow Threshold: $($Queue.OverflowThreshold) calls"
        
        # Get Agent Groups
        foreach ($AgentGroupId in $Queue.AgentGroupIDList) {
            $AgentGroup = Get-CsRgsAgentGroup -Identity $AgentGroupId
            Write-Host "Agent Group: $($AgentGroup.Name) ($($AgentGroup.AgentsByUri.Count) agents)"
            Write-Host "Routing Method: $($AgentGroup.RoutingMethod)"
        }
    }
    
    # Note: Actual call statistics would require additional cmdlets or reporting tools
    # This is a template for displaying the structure
    Write-Host "Call Statistics: [Requires additional reporting tools]"
    Write-Host "- Total Calls: [Data from monitoring database]"
    Write-Host "- Average Wait Time: [Data from monitoring database]"
    Write-Host "- Abandonment Rate: [Data from monitoring database]"
    Write-Host ""
    Write-Host "---"
    Write-Host ""
}`
    },
    {
      id: '7',
      name: 'Remove Response Group',
      description: 'Safely remove a response group and its components',
      category: 'responseGroup',
      script: `# Remove Response Group Safely
# Import Required Module
Import-Module Lync

# Define Variables
$ServiceId = "service:ApplicationServer:fe19pool.mdanderson.edu"
$WorkflowName = "Old Support Group"

# Get the workflow to remove
$Workflow = Get-CsRgsWorkflow -Identity $ServiceId -Name $WorkflowName

if ($Workflow) {
    Write-Host "Found workflow: $($Workflow.Name)"
    Write-Host "Primary URI: $($Workflow.PrimaryUri)"
    
    # Confirm removal (in production, add confirmation prompt)
    $Confirm = Read-Host "Are you sure you want to remove this Response Group? (y/N)"
    
    if ($Confirm -eq 'y' -or $Confirm -eq 'Y') {
        # Get associated components for cleanup
        if ($Workflow.DefaultAction.QueueID) {
            $Queue = Get-CsRgsQueue -Identity $Workflow.DefaultAction.QueueID
            Write-Host "Associated Queue: $($Queue.Name)"
            
            # Get Agent Groups
            foreach ($AgentGroupId in $Queue.AgentGroupIDList) {
                $AgentGroup = Get-CsRgsAgentGroup -Identity $AgentGroupId
                Write-Host "Associated Agent Group: $($AgentGroup.Name)"
            }
        }
        
        # Remove the workflow (this also cleans up dependent objects)
        Remove-CsRgsWorkflow -Identity $Workflow.Identity -Force
        
        Write-Host "Response Group '$WorkflowName' removed successfully!"
        Write-Host "Cleanup completed at: $(Get-Date)"
    } else {
        Write-Host "Removal cancelled."
    }
} else {
    Write-Error "Workflow '$WorkflowName' not found."
}`
    },
    {
      id: '8',
      name: 'Provision Common Area Phone',
      description: 'Set up a common area phone',
      category: 'commonArea',
      script: `# Provision Common Area Phone
New-CsCommonAreaPhone -LineUri "tel:+1XXXXXXXXX" -DisplayName "Phone Name" -RegistrarPool "poolname.domain.edu"`
    }
  ];

  // Search functionality
  const searchSkypeUsers = async () => {
    setIsSearching(true);
    setExecutionResults('Searching Skype for Business users...\n\n');
    
    // Simulate PowerShell search execution
    setTimeout(() => {
      const searchScript = `# Search Skype for Business Users
Import-Module Lync

# Search parameters
$SearchTerm = "${searchTerm}"
$SearchType = "${searchType}"

# Build search filter based on type
switch ($SearchType) {
    "extension" {
        $Users = Get-CsUser | Where-Object { $_.LineURI -like "*$SearchTerm*" }
        Write-Host "Searching by Extension: $SearchTerm"
    }
    "employeeId" {
        $Users = Get-CsAdUser | Where-Object { $_.EmployeeId -eq $SearchTerm }
        Write-Host "Searching by Employee ID: $SearchTerm"
    }
    "username" {
        $Users = Get-CsUser | Where-Object { $_.SamAccountName -like "*$SearchTerm*" }
        Write-Host "Searching by Username: $SearchTerm"
    }
    "email" {
        $Users = Get-CsUser | Where-Object { $_.UserPrincipalName -like "*$SearchTerm*" -or $_.EmailAddress -like "*$SearchTerm*" }
        Write-Host "Searching by Email: $SearchTerm"
    }
    default {
        $Users = Get-CsUser | Where-Object {
            $_.DisplayName -like "*$SearchTerm*" -or
            $_.UserPrincipalName -like "*$SearchTerm*" -or
            $_.SamAccountName -like "*$SearchTerm*" -or
            $_.LineURI -like "*$SearchTerm*"
        }
        Write-Host "Searching all fields for: $SearchTerm"
    }
}

# Display results
if ($Users) {
    Write-Host "Found $($Users.Count) user(s):"
    foreach ($User in $Users) {
        Write-Host "- $($User.DisplayName) ($($User.UserPrincipalName))"
        Write-Host "  Employee ID: $($User.EmployeeId)"
        Write-Host "  Line URI: $($User.LineURI)"
        Write-Host "  SIP Address: $($User.SipAddress)"
        Write-Host "  Department: $($User.Department)"
        Write-Host "  Office: $($User.Office)"
        Write-Host "  Voice Enabled: $($User.EnterpriseVoiceEnabled)"
        Write-Host "  ---"
    }
} else {
    Write-Host "No users found matching the search criteria."
}`;

      setExecutionResults(prev => prev + `Search Script Executed:\n${searchScript}\n\n`);
      setExecutionResults(prev => prev + `Search completed successfully!\n`);
      setExecutionResults(prev => prev + `Timestamp: ${new Date().toLocaleString()}\n`);
      setIsSearching(false);
      setHasSearchedUsers(true);
    }, 1500);
  };

  // Add new user functionality
  const addSkypeUser = async () => {
    if (!newUser.username || !newUser.phoneNumber) {
      alert('Please fill in both username and phone number');
      return;
    }

    setIsExecutingScript(true);
    setExecutionResults('Adding new Skype for Business user...\n\n');
    
    const addUserScript = `# Add New Skype for Business User
Import-Module Lync

# User parameters
$Username = "${newUser.username}"
$PhoneNumber = "${newUser.phoneNumber}"
$LineURI = "${newUser.lineURI || `tel:${newUser.phoneNumber.replace(/[^0-9+]/g, '')}`}"

# Step 1: Enable user for Skype for Business
try {
    Enable-CsUser -Identity $Username -RegistrarPool "fe19pool.mdanderson.edu" -SipAddressType EmailAddress
    Write-Host "✓ User enabled for Skype for Business: $Username"
    
    # Step 2: Configure Enterprise Voice
    Set-CsUser -Identity $Username -EnterpriseVoiceEnabled $true -LineURI $LineURI
    Write-Host "✓ Enterprise Voice enabled with Line URI: $LineURI"
    
    # Step 3: Assign Voice Policy
    Grant-CsVoicePolicy -Identity $Username -PolicyName "US_Policy"
    Write-Host "✓ Voice policy assigned: US_Policy"
    
    # Step 4: Assign Dial Plan
    Grant-CsDialPlan -Identity $Username -PolicyName "US_DialPlan"
    Write-Host "✓ Dial plan assigned: US_DialPlan"
    
    # Step 5: Get user information
    $UserInfo = Get-CsUser -Identity $Username
    Write-Host ""
    Write-Host "User Configuration Complete:"
    Write-Host "Display Name: $($UserInfo.DisplayName)"
    Write-Host "SIP Address: $($UserInfo.SipAddress)"
    Write-Host "Line URI: $($UserInfo.LineURI)"
    Write-Host "Enterprise Voice: $($UserInfo.EnterpriseVoiceEnabled)"
    Write-Host "Registrar Pool: $($UserInfo.RegistrarPool)"
    
} catch {
    Write-Error "Failed to add user: $($_.Exception.Message)"
}`;

    setTimeout(() => {
      setExecutionResults(prev => prev + `Add User Script:\n${addUserScript}\n\n`);
      setExecutionResults(prev => prev + `User added successfully!\n`);
      setExecutionResults(prev => prev + `Timestamp: ${new Date().toLocaleString()}\n`);
      setIsExecutingScript(false);
      setShowAddUserForm(false);
      setNewUser({ username: '', phoneNumber: '', lineURI: '' });
    }, 2000);
  };

  // Update Line URI functionality
  const updateLineURI = async (user: SkypeUser, newLineURI: string) => {
    setIsExecutingScript(true);
    setExecutionResults('Updating Line URI...\n\n');
    
    const updateScript = `# Update Skype for Business Line URI
Import-Module Lync

# Parameters
$Username = "${user.samAccountName}"
$NewLineURI = "${newLineURI}"
$OldLineURI = "${user.lineURI}"

# Update Line URI
try {
    Set-CsUser -Identity $Username -LineURI $NewLineURI
    Write-Host "✓ Line URI updated successfully"
    Write-Host "User: $Username"
    Write-Host "Old Line URI: $OldLineURI"
    Write-Host "New Line URI: $NewLineURI"
    
    # Verify the change
    $UpdatedUser = Get-CsUser -Identity $Username
    Write-Host ""
    Write-Host "Verification:"
    Write-Host "Current Line URI: $($UpdatedUser.LineURI)"
    Write-Host "Enterprise Voice Enabled: $($UpdatedUser.EnterpriseVoiceEnabled)"
    
} catch {
    Write-Error "Failed to update Line URI: $($_.Exception.Message)"
}`;

    setTimeout(() => {
      setExecutionResults(prev => prev + `Update Line URI Script:\n${updateScript}\n\n`);
      setExecutionResults(prev => prev + `Line URI updated successfully!\n`);
      setExecutionResults(prev => prev + `Timestamp: ${new Date().toLocaleString()}\n`);
      setIsExecutingScript(false);
      setShowLineURIForm(false);
    }, 1500);
  };

  // Common Area Phone Management Functions
  const searchCommonAreaPhones = async () => {
    setIsSearchingCommonArea(true);
    setExecutionResults('Searching Common Area Phones...\n\n');
    
    // Simulate PowerShell search execution
    setTimeout(() => {
      const searchScript = `# Search Common Area Phones
Import-Module Lync

# Search parameters
$SearchTerm = "${commonAreaSearchTerm}"
$SearchType = "${commonAreaSearchType}"

# Build search filter based on type
switch ($SearchType) {
    "name" {
        $Phones = Get-CsCommonAreaPhone | Where-Object { $_.DisplayName -like "*$SearchTerm*" }
        Write-Host "Searching by Name: $SearchTerm"
    }
    "number" {
        $Phones = Get-CsCommonAreaPhone | Where-Object { $_.LineUri -like "*$SearchTerm*" }
        Write-Host "Searching by Phone Number: $SearchTerm"
    }
    "location" {
        $Phones = Get-CsCommonAreaPhone | Where-Object { $_.Description -like "*$SearchTerm*" }
        Write-Host "Searching by Location: $SearchTerm"
    }
    default {
        $Phones = Get-CsCommonAreaPhone | Where-Object {
            $_.DisplayName -like "*$SearchTerm*" -or
            $_.LineUri -like "*$SearchTerm*" -or
            $_.Description -like "*$SearchTerm*"
        }
        Write-Host "Searching all fields for: $SearchTerm"
    }
}

# Display results
if ($Phones) {
    Write-Host "Found $($Phones.Count) common area phone(s):"
    foreach ($Phone in $Phones) {
        Write-Host "- $($Phone.DisplayName)"
        Write-Host "  Line URI: $($Phone.LineUri)"
        Write-Host "  SIP Address: $($Phone.SipAddress)"
        Write-Host "  Description: $($Phone.Description)"
        Write-Host "  Registrar Pool: $($Phone.RegistrarPool)"
        Write-Host "  ---"
    }
} else {
    Write-Host "No common area phones found matching the search criteria."
}`;

      setExecutionResults(prev => prev + `Search Script Executed:\n${searchScript}\n\n`);
      setExecutionResults(prev => prev + `Search completed successfully!\n`);
      setExecutionResults(prev => prev + `Timestamp: ${new Date().toLocaleString()}\n`);
      setIsSearchingCommonArea(false);
      setHasSearchedCommonArea(true);
    }, 1500);
  };

  // Add new common area phone functionality
  const addCommonAreaPhone = async () => {
    if (!newCommonAreaPhone.name || !newCommonAreaPhone.phoneNumber) {
      alert('Please fill in both name and phone number');
      return;
    }

    setIsExecutingScript(true);
    setExecutionResults('Adding new Common Area Phone...\n\n');
    
    const addPhoneScript = `# Add New Common Area Phone
Import-Module Lync

# Phone parameters
$PhoneName = "${newCommonAreaPhone.name}"
$PhoneNumber = "${newCommonAreaPhone.phoneNumber}"
$LineURI = "tel:${newCommonAreaPhone.phoneNumber.replace(/[^0-9+]/g, '')}"

# Step 1: Create Common Area Phone
try {
    New-CsCommonAreaPhone -LineUri $LineURI -DisplayName $PhoneName -RegistrarPool "fe19pool.mdanderson.edu"
    Write-Host "✓ Common Area Phone created: $PhoneName"
    Write-Host "✓ Line URI assigned: $LineURI"
    
    # Step 2: Set additional properties
    $Phone = Get-CsCommonAreaPhone -Filter {DisplayName -eq $PhoneName}
    if ($Phone) {
        # Set description/location if needed
        Set-CsCommonAreaPhone -Identity $Phone.Identity -Description "Common area phone in location"
        Write-Host "✓ Phone configuration updated"
    }
    
    # Step 3: Get phone information for verification
    $PhoneInfo = Get-CsCommonAreaPhone -Filter {DisplayName -eq $PhoneName}
    Write-Host ""
    Write-Host "Common Area Phone Configuration Complete:"
    Write-Host "Display Name: $($PhoneInfo.DisplayName)"
    Write-Host "SIP Address: $($PhoneInfo.SipAddress)"
    Write-Host "Line URI: $($PhoneInfo.LineUri)"
    Write-Host "Registrar Pool: $($PhoneInfo.RegistrarPool)"
    Write-Host "Identity: $($PhoneInfo.Identity)"
    
} catch {
    Write-Error "Failed to add common area phone: $($_.Exception.Message)"
}`;

    setTimeout(() => {
      setExecutionResults(prev => prev + `Add Common Area Phone Script:\n${addPhoneScript}\n\n`);
      setExecutionResults(prev => prev + `Common Area Phone added successfully!\n`);
      setExecutionResults(prev => prev + `Timestamp: ${new Date().toLocaleString()}\n`);
      setIsExecutingScript(false);
      setShowAddCommonAreaForm(false);
      setNewCommonAreaPhone({ name: '', phoneNumber: '' });
    }, 2000);
  };

  // Reset PIN functionality
  const resetCommonAreaPIN = async (phone: CommonAreaPhone) => {
    setIsExecutingScript(true);
    setExecutionResults('Resetting Common Area Phone PIN...\n\n');
    
    const resetPINScript = `# Reset Common Area Phone PIN
Import-Module Lync

# Parameters
$PhoneName = "${phone.displayName}"
$PhoneIdentity = "${phone.id}"

# Reset PIN for Common Area Phone
try {
    # Generate new random PIN
    $NewPIN = Get-Random -Minimum 1000 -Maximum 9999
    
    # Reset the PIN using Set-CsClientPin
    Set-CsClientPin -Identity "sip:${phone.displayName.toLowerCase().replace(/\s+/g, '')}@mdanderson.org" -Pin $NewPIN
    Write-Host "✓ PIN reset successfully for: $PhoneName"
    Write-Host "✓ New PIN: $NewPIN"
    
    # Verify the change
    $PinInfo = Get-CsClientPinInfo -Identity "sip:${phone.displayName.toLowerCase().replace(/\s+/g, '')}@mdanderson.org"
    Write-Host ""
    Write-Host "PIN Reset Verification:"
    Write-Host "Phone: $PhoneName"
    Write-Host "PIN Status: $($PinInfo.IsPinSet)"
    Write-Host "Last PIN Change: $(Get-Date)"
    
    Write-Host ""
    Write-Host "IMPORTANT: Please provide the new PIN ($NewPIN) to users of this phone."
    
} catch {
    Write-Error "Failed to reset PIN: $($_.Exception.Message)"
}`;

    setTimeout(() => {
      setExecutionResults(prev => prev + `Reset PIN Script:\n${resetPINScript}\n\n`);
      setExecutionResults(prev => prev + `PIN reset completed successfully!\n`);
      setExecutionResults(prev => prev + `Timestamp: ${new Date().toLocaleString()}\n`);
      setIsExecutingScript(false);
      setShowResetPINForm(false);
    }, 1500);
  };

  // Remove common area phone functionality
  const removeCommonAreaPhone = async () => {
    if (!removeCommonAreaName) {
      alert('Please enter the name of the common area phone to remove');
      return;
    }

    setIsExecutingScript(true);
    setExecutionResults('Removing Common Area Phone...\n\n');
    
    const removePhoneScript = `# Remove Common Area Phone
Import-Module Lync

# Parameters
$PhoneName = "${removeCommonAreaName}"

# Find and remove the common area phone
try {
    # Find the phone by display name
    $Phone = Get-CsCommonAreaPhone | Where-Object { $_.DisplayName -like "*$PhoneName*" }
    
    if ($Phone) {
        Write-Host "Found phone: $($Phone.DisplayName)"
        Write-Host "SIP Address: $($Phone.SipAddress)"
        Write-Host "Line URI: $($Phone.LineUri)"
        
        # Confirm removal (in production, add confirmation prompt)
        Write-Host ""
        Write-Host "Proceeding with removal..."
        
        # Remove the common area phone
        Remove-CsCommonAreaPhone -Identity $Phone.Identity -Confirm:$false
        
        Write-Host "✓ Common Area Phone '$($Phone.DisplayName)' removed successfully!"
        Write-Host "✓ Line URI $($Phone.LineUri) is now available for reuse"
        Write-Host "✓ Removal completed at: $(Get-Date)"
        
    } else {
        Write-Host "⚠ No common area phone found with name matching: $PhoneName"
        Write-Host "Available phones:"
        Get-CsCommonAreaPhone | ForEach-Object { Write-Host "  - $($_.DisplayName)" }
    }
    
} catch {
    Write-Error "Failed to remove common area phone: $($_.Exception.Message)"
}`;

    setTimeout(() => {
      setExecutionResults(prev => prev + `Remove Common Area Phone Script:\n${removePhoneScript}\n\n`);
      setExecutionResults(prev => prev + `Removal operation completed!\n`);
      setExecutionResults(prev => prev + `Timestamp: ${new Date().toLocaleString()}\n`);
      setIsExecutingScript(false);
      setShowRemoveCommonAreaForm(false);
      setRemoveCommonAreaName('');
    }, 2000);
  };

  const executeScript = async (script: PowerShellScript) => {
    setIsExecutingScript(true);
    setExecutionResults('Executing PowerShell script...\n\n');
    
    // Simulate script execution - in real app this would call backend API
    setTimeout(() => {
      setExecutionResults(prev => prev + `Script: ${script.name}\n`);
      setExecutionResults(prev => prev + `Description: ${script.description}\n\n`);
      setExecutionResults(prev => prev + `PowerShell Commands:\n${script.script}\n\n`);
      setExecutionResults(prev => prev + `Status: Script executed successfully!\n`);
      setExecutionResults(prev => prev + `Timestamp: ${new Date().toLocaleString()}\n`);
      setIsExecutingScript(false);
    }, 2000);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      disabled: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      online: 'bg-green-100 text-green-800',
      offline: 'bg-red-100 text-red-800',
      provisioning: 'bg-blue-100 text-blue-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'inactive':
      case 'disabled':
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
      case 'provisioning':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Skype for Business Manager</h1>
        <p className="text-gray-500 mt-1">Manage users, response groups, and common area phones</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="responseGroups" className="flex items-center space-x-2">
            <Phone className="w-4 h-4" />
            <span>Response Groups</span>
          </TabsTrigger>
          <TabsTrigger value="commonArea" className="flex items-center space-x-2">
            <Monitor className="w-4 h-4" />
            <span>Common Area Phones</span>
          </TabsTrigger>
          <TabsTrigger value="scripts" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>PowerShell Scripts</span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Skype for Business Users</span>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setShowAddUserForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add User</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowLineURIForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Update Line URI</span>
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Search and manage Skype for Business users with comprehensive Active Directory integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Enhanced Search Section */}
              <div className="mb-6 space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by extension, employee ID, username, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        onKeyPress={(e) => e.key === 'Enter' && searchSkypeUsers()}
                      />
                    </div>
                  </div>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Fields</option>
                    <option value="extension">Extension</option>
                    <option value="employeeId">Employee ID</option>
                    <option value="username">Username</option>
                    <option value="email">Email</option>
                  </select>
                  <Button
                    onClick={searchSkypeUsers}
                    disabled={isSearching || !searchTerm}
                    className="flex items-center space-x-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>{isSearching ? 'Searching...' : 'Search'}</span>
                  </Button>
                </div>
              </div>

              {/* Add User Form */}
              {showAddUserForm && (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Add New Skype for Business User</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Username (SAMAccount)
                        </label>
                        <Input
                          placeholder="e.g., username"
                          value={newUser.username}
                          onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <Input
                          placeholder="e.g., +1-XXX-XXX-XXXX"
                          value={newUser.phoneNumber}
                          onChange={(e) => setNewUser({...newUser, phoneNumber: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Line URI (Optional)
                        </label>
                        <Input
                          placeholder="e.g., tel:+1XXXXXXXXXX"
                          value={newUser.lineURI}
                          onChange={(e) => setNewUser({...newUser, lineURI: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Button
                        onClick={addSkypeUser}
                        disabled={isExecutingScript}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add User</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddUserForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Update Line URI Form */}
              {showLineURIForm && (
                <Card className="mb-6 border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Update Line URI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select User
                        </label>
                        <select
                          value={selectedUser?.id || ''}
                          onChange={(e) => {
                            const user = skypeUsers.find(u => u.id === e.target.value);
                            setSelectedUser(user || null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a user...</option>
                          {skypeUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.displayName} ({user.samAccountName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Line URI
                        </label>
                        <Input
                          placeholder="e.g., tel:+1XXXXXXXXXX"
                          disabled={!selectedUser}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Button
                        onClick={() => selectedUser && updateLineURI(selectedUser, 'tel:+1XXXXXXXXXX')}
                        disabled={isExecutingScript || !selectedUser}
                        className="flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Update Line URI</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowLineURIForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Enhanced User Display */}
              {!hasSearchedUsers ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Search for Skype for Business Users</h3>
                  <p className="text-gray-500 mb-4">
                    Enter search criteria above to find and manage users. You can search by extension, employee ID, username, email, or all fields.
                  </p>
                  <p className="text-sm text-gray-400">
                    Use the search bar above to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {skypeUsers.map((user) => (
                  <div key={user.id} className={`border rounded-lg overflow-hidden ${user.isKiosk ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                    {/* User Header */}
                    <div className="p-4 bg-gray-50 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(user.status)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900 text-lg">{user.displayName}</h3>
                              <Badge className={getStatusBadge(user.status)}>
                                {user.status}
                              </Badge>
                              {user.isKiosk && (
                                <Badge className="bg-orange-100 text-orange-800 flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>KIOSK</span>
                                </Badge>
                              )}
                              {user.enterpriseVoiceEnabled && (
                                <Badge className="bg-green-100 text-green-800">
                                  Voice Enabled
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{user.upn}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Settings className="w-4 h-4" />
                            <span className="ml-1">Manage</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Detailed User Information */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Basic Information */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            Basic Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Employee ID:</span>
                              <span className="ml-2 font-mono">{user.employeeId}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">SAMAccount:</span>
                              <span className="ml-2 font-mono">{user.samAccountName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">UPN:</span>
                              <span className="ml-2 font-mono text-blue-600">{user.upn}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Email:</span>
                              <span className="ml-2">{user.emailAddress}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Department:</span>
                              <span className="ml-2">{user.department}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Office:</span>
                              <span className="ml-2">{user.office}</span>
                            </div>
                          </div>
                        </div>

                        {/* Phone Information */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            Phone Configuration
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Extension:</span>
                              <span className="ml-2 font-mono font-semibold">{user.extension}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Office Phone:</span>
                              <span className="ml-2 font-mono">{user.officePhone}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">msRTCSIP-Line:</span>
                              <span className="ml-2 font-mono text-green-600">{user.msRTCSIPLine || 'Not set'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Line URI:</span>
                              <span className="ml-2 font-mono text-green-600">{user.lineURI || 'Not set'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Voice Policy:</span>
                              <span className="ml-2">{user.voicePolicy || 'Not assigned'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Skype for Business */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <Monitor className="w-4 h-4 mr-2" />
                            Skype for Business
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Primary SIP:</span>
                              <span className="ml-2 font-mono text-blue-600">{user.msRTCSIPPrimaryAddress}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Target Address:</span>
                              <span className="ml-2 font-mono">{user.targetAddress}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Registrar Pool:</span>
                              <span className="ml-2">{user.registrarPool || 'Not assigned'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">O365 User:</span>
                              <span className={`ml-2 ${user.isO365 ? 'text-green-600' : 'text-red-600'}`}>
                                {user.isO365 ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Last Sync:</span>
                              <span className="ml-2">
                                {user.lastSync ? new Date(user.lastSync).toLocaleString() : 'Never synced'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Proxy Addresses */}
                      {user.proxyAddress.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-medium text-gray-900 mb-3">Proxy Addresses</h4>
                          <div className="flex flex-wrap gap-2">
                            {user.proxyAddress.map((address, index) => (
                              <Badge key={index} variant="outline" className="font-mono text-xs">
                                {address}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                 ))}
               </div>
             )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Response Groups Tab */}
        <TabsContent value="responseGroups" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Response Groups</span>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Group</span>
                </Button>
              </CardTitle>
              <CardDescription>
                Manage call distribution groups and queues with full workflow configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {responseGroups.map((group) => (
                  <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Header Section */}
                    <div className="p-4 bg-gray-50 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
                            <Badge className={getStatusBadge(group.status)}>
                              {group.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {group.workflowType}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                            <span className="ml-1">Edit</span>
                          </Button>
                          <Button variant="outline" size="sm">
                            <Play className="w-4 h-4" />
                            <span className="ml-1">Test</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Contact Information */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            Contact Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Phone:</span>
                              <span className="ml-2 font-mono">{group.phoneNumber}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">SIP:</span>
                              <span className="ml-2 font-mono text-blue-600">{group.sipAddress}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Language:</span>
                              <span className="ml-2">{group.language}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Time Zone:</span>
                              <span className="ml-2">{group.timeZone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Queue Configuration */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            Queue Settings
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Queue:</span>
                              <span className="ml-2">{group.queueName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Timeout:</span>
                              <span className="ml-2">{group.timeoutThreshold}s</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Overflow:</span>
                              <span className="ml-2">{group.overflowThreshold} calls</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Overflow Action:</span>
                              <span className="ml-2 capitalize">{group.overflowAction}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Timeout Action:</span>
                              <span className="ml-2 capitalize">{group.timeoutAction}</span>
                            </div>
                          </div>
                        </div>

                        {/* Statistics */}
                        {group.statistics && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 flex items-center">
                              <Monitor className="w-4 h-4 mr-2" />
                              Statistics
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-500">Total Calls:</span>
                                <span className="ml-2 font-semibold">{group.statistics.totalCalls.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Avg Wait:</span>
                                <span className="ml-2">{group.statistics.averageWaitTime}s</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Abandonment:</span>
                                <span className="ml-2 text-red-600">{group.statistics.abandonmentRate}%</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Last Updated:</span>
                                <span className="ml-2">{new Date(group.statistics.lastUpdated).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Agent Groups */}
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 flex items-center mb-3">
                          <Users className="w-4 h-4 mr-2" />
                          Agent Groups ({group.agentGroups.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.agentGroups.map((agentGroup, index) => (
                            <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-blue-900">{agentGroup.name}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {agentGroup.participationPolicy}
                                </Badge>
                              </div>
                              <div className="text-sm space-y-1">
                                <div>
                                  <span className="text-blue-700">Routing:</span>
                                  <span className="ml-2 capitalize">{agentGroup.routingMethod.replace('-', ' ')}</span>
                                </div>
                                <div>
                                  <span className="text-blue-700">Agents:</span>
                                  <span className="ml-2 font-semibold">{agentGroup.agents.length}</span>
                                </div>
                                <div className="mt-2">
                                  <div className="text-xs text-blue-600">
                                    {agentGroup.agents.slice(0, 3).map(agent => agent.split('@')[0]).join(', ')}
                                    {agentGroup.agents.length > 3 && ` +${agentGroup.agents.length - 3} more`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Business Hours */}
                      {group.businessHours.enabled && (
                        <div className="mt-6">
                          <h4 className="font-medium text-gray-900 flex items-center mb-3">
                            <Clock className="w-4 h-4 mr-2" />
                            Business Hours
                          </h4>
                          <div className="grid grid-cols-7 gap-2 text-sm">
                            {Object.entries(group.businessHours.schedule).map(([day, hours]) => (
                              <div key={day} className={`p-2 rounded text-center ${hours.enabled ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                                <div className="font-medium text-xs">{day.slice(0, 3)}</div>
                                {hours.enabled ? (
                                  <div className="text-xs text-green-700 mt-1">
                                    {hours.startTime} - {hours.endTime}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 mt-1">Closed</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* IVR Configuration */}
                      {group.ivr?.enabled && (
                        <div className="mt-6">
                          <h4 className="font-medium text-gray-900 flex items-center mb-3">
                            <Phone className="w-4 h-4 mr-2" />
                            IVR Menu
                          </h4>
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="text-sm text-purple-800 mb-2">
                              <strong>Welcome Message:</strong> {group.ivr.welcomeMessage}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {group.ivr.menuOptions.map((option, index) => (
                                <div key={index} className="p-2 bg-white rounded border">
                                  <div className="font-medium text-purple-900">Key: {option.key}</div>
                                  <div className="text-xs text-purple-700 capitalize">{option.action}</div>
                                  {option.target && (
                                    <div className="text-xs text-purple-600 font-mono">{option.target}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex justify-between text-xs text-gray-500">
                          <div>Created: {new Date(group.created).toLocaleString()} by {group.createdBy}</div>
                          <div>Modified: {new Date(group.lastModified).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Common Area Phones Tab */}
        <TabsContent value="commonArea" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Common Area Phones</span>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setShowAddCommonAreaForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Phone</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowResetPINForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Reset PIN</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRemoveCommonAreaForm(true)}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Remove Phone</span>
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Search and manage common area phones with PIN reset and removal capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Enhanced Search Section */}
              <div className="mb-6 space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by name, phone number, or location..."
                        value={commonAreaSearchTerm}
                        onChange={(e) => setCommonAreaSearchTerm(e.target.value)}
                        className="pl-10"
                        onKeyPress={(e) => e.key === 'Enter' && searchCommonAreaPhones()}
                      />
                    </div>
                  </div>
                  <select
                    value={commonAreaSearchType}
                    onChange={(e) => setCommonAreaSearchType(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Fields</option>
                    <option value="name">Name</option>
                    <option value="number">Phone Number</option>
                    <option value="location">Location</option>
                  </select>
                  <Button
                    onClick={searchCommonAreaPhones}
                    disabled={isSearchingCommonArea || !commonAreaSearchTerm}
                    className="flex items-center space-x-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>{isSearchingCommonArea ? 'Searching...' : 'Search'}</span>
                  </Button>
                </div>
              </div>

              {/* Add Common Area Phone Form */}
              {showAddCommonAreaForm && (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Add New Common Area Phone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Common Area Name
                        </label>
                        <Input
                          placeholder="e.g., Lobby Phone, Conference Room A"
                          value={newCommonAreaPhone.name}
                          onChange={(e) => setNewCommonAreaPhone({...newCommonAreaPhone, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <Input
                          placeholder="e.g., +1-XXX-XXX-XXXX"
                          value={newCommonAreaPhone.phoneNumber}
                          onChange={(e) => setNewCommonAreaPhone({...newCommonAreaPhone, phoneNumber: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Button
                        onClick={addCommonAreaPhone}
                        disabled={isExecutingScript}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Phone</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddCommonAreaForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reset PIN Form */}
              {showResetPINForm && (
                <Card className="mb-6 border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Reset Common Area Phone PIN</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Common Area Phone
                        </label>
                        <select
                          value={selectedCommonAreaPhone?.id || ''}
                          onChange={(e) => {
                            const phone = commonAreaPhones.find(p => p.id === e.target.value);
                            setSelectedCommonAreaPhone(phone || null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a common area phone...</option>
                          {commonAreaPhones.map(phone => (
                            <option key={phone.id} value={phone.id}>
                              {phone.displayName} ({phone.phoneNumber})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Button
                        onClick={() => selectedCommonAreaPhone && resetCommonAreaPIN(selectedCommonAreaPhone)}
                        disabled={isExecutingScript || !selectedCommonAreaPhone}
                        className="flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Reset PIN</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowResetPINForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Remove Common Area Phone Form */}
              {showRemoveCommonAreaForm && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Remove Common Area Phone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Common Area Phone Name
                        </label>
                        <Input
                          placeholder="Enter the name of the phone to remove..."
                          value={removeCommonAreaName}
                          onChange={(e) => setRemoveCommonAreaName(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This will permanently remove the common area phone from Skype for Business
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Button
                        onClick={removeCommonAreaPhone}
                        disabled={isExecutingScript || !removeCommonAreaName}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Remove Phone</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowRemoveCommonAreaForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Enhanced Phone Display */}
              {!hasSearchedCommonArea ? (
                <div className="text-center py-12">
                  <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Search for Common Area Phones</h3>
                  <p className="text-gray-500 mb-4">
                    Enter search criteria above to find and manage common area phones. You can search by name, phone number, location, or all fields.
                  </p>
                  <p className="text-sm text-gray-400">
                    Use the search bar above to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {commonAreaPhones.map((phone) => (
                  <div key={phone.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Phone Header */}
                    <div className="p-4 bg-gray-50 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(phone.status)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900 text-lg">{phone.displayName}</h3>
                              <Badge className={getStatusBadge(phone.status)}>
                                {phone.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{phone.location}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetCommonAreaPIN(phone)}
                            className="flex items-center space-x-1"
                          >
                            <Settings className="w-4 h-4" />
                            <span>Reset PIN</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCommonAreaPhone(phone)}
                          >
                            <Settings className="w-4 h-4" />
                            <span className="ml-1">Manage</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Phone Information */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Basic Information */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            Phone Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Display Name:</span>
                              <span className="ml-2 font-semibold">{phone.displayName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Phone Number:</span>
                              <span className="ml-2 font-mono">{phone.phoneNumber}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <span className="ml-2">{phone.location}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Status:</span>
                              <span className={`ml-2 ${phone.status === 'online' ? 'text-green-600' : phone.status === 'offline' ? 'text-red-600' : 'text-yellow-600'}`}>
                                {phone.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Technical Information */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <Monitor className="w-4 h-4 mr-2" />
                            Technical Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            {phone.macAddress && (
                              <div>
                                <span className="text-gray-500">MAC Address:</span>
                                <span className="ml-2 font-mono">{phone.macAddress}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">SIP Address:</span>
                              <span className="ml-2 font-mono text-blue-600">sip:{phone.displayName.toLowerCase().replace(/\s+/g, '')}@mdanderson.org</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Line URI:</span>
                              <span className="ml-2 font-mono text-green-600">tel:{phone.phoneNumber.replace(/[^0-9+]/g, '')}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Device Type:</span>
                              <span className="ml-2">Common Area Phone</span>
                            </div>
                          </div>
                        </div>

                        {/* Management Actions */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <Settings className="w-4 h-4 mr-2" />
                            Actions
                          </h4>
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                setSelectedCommonAreaPhone(phone);
                                setShowResetPINForm(true);
                              }}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Reset PIN
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                setRemoveCommonAreaName(phone.displayName);
                                setShowRemoveCommonAreaForm(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Remove Phone
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                 ))}
               </div>
             )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PowerShell Scripts Tab */}
        <TabsContent value="scripts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Scripts</CardTitle>
                <CardDescription>
                  PowerShell scripts for Skype for Business management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {powershellScripts.map((script) => (
                    <div key={script.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{script.name}</h3>
                          <p className="text-sm text-gray-600">{script.description}</p>
                          <Badge className="mt-2" variant="outline">
                            {script.category}
                          </Badge>
                        </div>
                        <Button 
                          onClick={() => executeScript(script)}
                          disabled={isExecutingScript}
                          className="flex items-center space-x-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>Execute</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Script Execution Results</CardTitle>
                <CardDescription>
                  View PowerShell script execution output
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={executionResults}
                  readOnly
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Script execution results will appear here..."
                />
                {isExecutingScript && (
                  <div className="mt-4 flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Executing script...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};