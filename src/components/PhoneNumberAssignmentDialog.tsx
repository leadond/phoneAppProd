import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Users, Building, MapPin, Phone, AlertTriangle } from 'lucide-react';
import { dataService, PhoneNumber } from '../services/dataService';

interface PhoneNumberAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  numbers: PhoneNumber[];
  onAssignmentComplete: () => void;
}

interface AssignmentForm {
  assignedTo: string;
  department: string;
  location: string;
  notes: string;
  system: string;
}

export const PhoneNumberAssignmentDialog: React.FC<PhoneNumberAssignmentDialogProps> = ({
  isOpen,
  onClose,
  numbers,
  onAssignmentComplete
}) => {
  const [formData, setFormData] = useState<AssignmentForm>({
    assignedTo: '',
    department: '',
    location: '',
    notes: '',
    system: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get available numbers for assignment
  const availableNumbers = numbers.filter(num => num.status === 'available');
  const isBulkAssignment = numbers.length > 1;

  useEffect(() => {
    if (isOpen) {
      // Reset form when dialog opens
      setFormData({
        assignedTo: '',
        department: '',
        location: '',
        notes: '',
        system: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.assignedTo.trim()) {
      newErrors.assignedTo = 'Assignee is required';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.system.trim()) {
      newErrors.system = 'System is required';
    }

    if (availableNumbers.length === 0) {
      newErrors.general = 'No available numbers to assign';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      let successCount = 0;
      let failedCount = 0;

      for (const number of availableNumbers) {
        try {
          await dataService.updatePhoneNumber(number.id, {
            status: 'assigned',
            assignedTo: formData.assignedTo.trim(),
            department: formData.department.trim(),
            location: formData.location.trim(),
            system: formData.system.trim(),
            notes: formData.notes.trim(),
            dateAssigned: now,
            dateAvailable: null
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to assign number ${number.number}:`, error);
          failedCount++;
        }
      }

      if (successCount > 0) {
        onAssignmentComplete();
        onClose();
      }

      if (failedCount > 0) {
        setErrors({ general: `${failedCount} assignments failed` });
      }
    } catch (error) {
      console.error('Assignment failed:', error);
      setErrors({ general: 'Assignment failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof AssignmentForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const unavailableNumbers = numbers.filter(num => num.status !== 'available');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {isBulkAssignment ? 'Bulk Assign Phone Numbers' : 'Assign Phone Number'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Numbers Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Numbers to Assign ({availableNumbers.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {availableNumbers.map((number) => (
                <div key={number.id} className="flex items-center gap-2 text-sm">
                  <Badge className="bg-blue-100 text-blue-800">
                    {number.number}
                  </Badge>
                  <span className="text-gray-600">{number.extension}</span>
                </div>
              ))}
            </div>

            {unavailableNumbers.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center gap-2 text-yellow-800 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Unavailable Numbers ({unavailableNumbers.length})
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  These numbers cannot be assigned as they are not available:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {unavailableNumbers.map((number) => (
                    <div key={number.id} className="flex items-center gap-2 text-sm">
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {number.number}
                      </Badge>
                      <span className="text-gray-600">({number.status})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assignment Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignedTo" className="required">Assigned To</Label>
              <Input
                id="assignedTo"
                placeholder="Enter name or email"
                value={formData.assignedTo}
                onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                className={errors.assignedTo ? 'border-red-500' : ''}
              />
              {errors.assignedTo && (
                <p className="text-sm text-red-600">{errors.assignedTo}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="required">Department</Label>
              <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Executive">Executive</SelectItem>
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-sm text-red-600">{errors.department}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="system" className="required">System</Label>
              <Select value={formData.system} onValueChange={(value) => handleInputChange('system', value)}>
                <SelectTrigger className={errors.system ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                  <SelectItem value="Genesys Cloud">Genesys Cloud</SelectItem>
                  <SelectItem value="Skype for Business">Skype for Business</SelectItem>
                  <SelectItem value="RightFax">RightFax</SelectItem>
                  <SelectItem value="AudioCodes">AudioCodes</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.system && (
                <p className="text-sm text-red-600">{errors.system}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Office location or region"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this assignment..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {errors.general}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || availableNumbers.length === 0}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Assigning...' : `Assign ${availableNumbers.length} Number${availableNumbers.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};