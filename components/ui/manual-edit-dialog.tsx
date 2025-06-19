'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Edit3, Save, X, Plus, Trash2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ManualEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionTitle: string;
  currentContent: any;
  onSave: (newContent: any) => void;
  contentType?: 'string' | 'array' | 'object' | 'array-of-objects';
  fieldDefinitions?: FieldDefinition[];
}

interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select' | 'array';
  options?: string[];
  placeholder?: string;
  isLarge?: boolean; // For larger textareas
}

// Sortable item component for drag and drop
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 cursor-move" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

export function ManualEditDialog({
  open,
  onOpenChange,
  sectionTitle,
  currentContent,
  onSave,
  contentType = 'string',
  fieldDefinitions = [],
}: ManualEditDialogProps) {
  const [editedContent, setEditedContent] = useState<any>('');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      // Initialize edited content based on type
      if (contentType === 'array') {
        setEditedContent(Array.isArray(currentContent) ? [...currentContent] : []);
      } else if (contentType === 'array-of-objects') {
        setEditedContent(Array.isArray(currentContent) ? [...currentContent] : []);
      } else if (contentType === 'object') {
        setEditedContent(currentContent ? { ...currentContent } : {});
      } else {
        setEditedContent(currentContent || '');
      }
    }
  }, [open, currentContent, contentType]);

  const handleSave = () => {
    try {
      onSave(editedContent);
      onOpenChange(false);
      toast({
        title: 'Success',
        description: 'Your changes have been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setEditedContent('');
    onOpenChange(false);
  };

  const handleArrayItemChange = (index: number, value: string) => {
    const newArray = [...editedContent];
    newArray[index] = value;
    setEditedContent(newArray);
  };

  const handleArrayItemAdd = () => {
    setEditedContent([...editedContent, '']);
  };

  const handleArrayItemRemove = (index: number) => {
    const newArray = editedContent.filter((_: any, i: number) => i !== index);
    setEditedContent(newArray);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setEditedContent((items: any[]) => {
        const oldIndex = items.findIndex((_, i) => i.toString() === active.id);
        const newIndex = items.findIndex((_, i) => i.toString() === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleObjectFieldChange = (index: number, field: string, value: string | any[]) => {
    const newArray = [...editedContent];
    newArray[index] = { ...newArray[index], [field]: value };
    setEditedContent(newArray);
  };

  const handleObjectAdd = () => {
    const newObject: any = {};
    fieldDefinitions.forEach(field => {
      newObject[field.key] = '';
    });
    setEditedContent([...editedContent, newObject]);
  };

  const renderEditContent = () => {
    if (contentType === 'array') {
      return (
        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={editedContent.map((_: any, i: number) => i.toString())}
              strategy={verticalListSortingStrategy}
            >
              {editedContent.map((item: string, index: number) => (
                <SortableItem key={index} id={index.toString()}>
                  <div className="flex gap-2">
                    <Textarea
                      value={item}
                      onChange={(e) => handleArrayItemChange(index, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                      className="flex-1 min-h-[60px]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArrayItemRemove(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
          <Button
            variant="outline"
            size="sm"
            onClick={handleArrayItemAdd}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      );
    }

    if (contentType === 'array-of-objects' && fieldDefinitions.length > 0) {
      return (
        <div className="space-y-4">
          {editedContent.map((item: any, index: number) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm">Item {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArrayItemRemove(index)}
                  className="text-red-600 hover:text-red-700 -mt-2 -mr-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {fieldDefinitions.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={`${field.key}-${index}`} className="text-sm">
                    {field.label}
                  </Label>
                  {field.type === 'array' ? (
                    <div className="mt-1 space-y-2">
                      <p className="text-xs text-muted-foreground">Each bullet point describes a responsibility or achievement. Drag to reorder.</p>
                      <div className="max-h-[300px] overflow-y-auto border rounded-md p-3 space-y-2 bg-muted/10">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => {
                            const { active, over } = event;
                            if (active.id !== over?.id) {
                              const bullets = item[field.key] || [];
                              const oldIndex = parseInt(active.id as string);
                              const newIndex = parseInt(over?.id as string);
                              const newBullets = arrayMove(bullets, oldIndex, newIndex);
                              handleObjectFieldChange(index, field.key, newBullets);
                            }
                          }}
                        >
                          <SortableContext
                            items={(item[field.key] || []).map((_: any, i: number) => i.toString())}
                            strategy={verticalListSortingStrategy}
                          >
                            {(Array.isArray(item[field.key]) ? item[field.key] : []).map((bulletItem: string, bulletIndex: number) => (
                              <SortableItem key={bulletIndex} id={bulletIndex.toString()}>
                                <div className="flex gap-2">
                                  <Textarea
                                    value={bulletItem}
                                    onChange={(e) => {
                                      const newBullets = [...(item[field.key] || [])];
                                      newBullets[bulletIndex] = e.target.value;
                                      handleObjectFieldChange(index, field.key, newBullets);
                                    }}
                                    placeholder={`Describe a key responsibility or achievement...`}
                                    className="flex-1 min-h-[80px] text-sm resize-y"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newBullets = (item[field.key] || []).filter((_: any, i: number) => i !== bulletIndex);
                                      handleObjectFieldChange(index, field.key, newBullets);
                                    }}
                                    className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </SortableItem>
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newBullets = [...(item[field.key] || []), ''];
                          handleObjectFieldChange(index, field.key, newBullets);
                        }}
                        className="w-full text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Bullet Point
                      </Button>
                    </div>
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      id={`${field.key}-${index}`}
                      value={item[field.key] || ''}
                      onChange={(e) => handleObjectFieldChange(index, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className={`mt-1 ${field.isLarge ? 'min-h-[150px] max-h-[300px]' : 'min-h-[80px]'}`}
                    />
                  ) : field.type === 'select' && field.options ? (
                    <select
                      id={`${field.key}-${index}`}
                      value={item[field.key] || ''}
                      onChange={(e) => handleObjectFieldChange(index, field.key, e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`${field.key}-${index}`}
                      type={field.type}
                      value={item[field.key] || ''}
                      onChange={(e) => handleObjectFieldChange(index, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleObjectAdd}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add {sectionTitle.replace(/s$/, '')}
          </Button>
        </div>
      );
    }

    if (contentType === 'object' && fieldDefinitions.length > 0) {
      return (
        <div className="space-y-3">
          {fieldDefinitions.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.key}
                  value={editedContent[field.key] || ''}
                  onChange={(e) => setEditedContent({ ...editedContent, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="mt-1"
                />
              ) : (
                <Input
                  id={field.key}
                  type={field.type}
                  value={editedContent[field.key] || ''}
                  onChange={(e) => setEditedContent({ ...editedContent, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="mt-1"
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    // Default string/textarea
    return (
      <Textarea
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        placeholder={`Enter ${sectionTitle.toLowerCase()} content...`}
        className="min-h-[200px]"
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sectionTitle.toLowerCase().includes('experience') ? 'max-w-4xl' : 'max-w-3xl'} max-h-[85vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            Edit {sectionTitle}
          </DialogTitle>
          <DialogDescription>
            Make changes to your {sectionTitle.toLowerCase()} section below.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderEditContent()}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}