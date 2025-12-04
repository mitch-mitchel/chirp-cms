import type { GlobalConfig } from 'payload'
import { sendWebhook } from '../utils/webhook'

export const VolunteerFormSettings: GlobalConfig = {
  slug: 'volunteerFormSettings',
  label: 'Volunteer Form Settings',
  admin: {
    group: 'Content Assets',
    description: 'Configure the Volunteer Details form fields and options',
  },
  versions: {
    drafts: false,
    maxPerDoc: 25,
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async () => {
        // Send webhook notification to front-end
        await sendWebhook({
          collection: 'volunteer-form-settings',
          operation: 'update',
          timestamp: new Date().toISOString(),
        })
      },
    ],
  },
  fields: [
    {
      name: 'ageQuestion',
      type: 'group',
      label: 'Age Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: 'Your Age (Generally) *',
        },
        {
          name: 'options',
          type: 'array',
          label: 'Age Range Options',
          defaultValue: [
            { value: '18–24' },
            { value: '25–34' },
            { value: '35–44' },
            { value: '45–54' },
            { value: '55–64' },
            { value: '65+' },
          ],
          fields: [
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'educationQuestion',
      type: 'group',
      label: 'Education Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: 'What colleges/universities have you attended? *',
        },
        {
          name: 'placeholder',
          type: 'text',
          defaultValue: 'Loyola University Chicago',
        },
      ],
    },
    {
      name: 'employerQuestion',
      type: 'group',
      label: 'Employer Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: 'Who are you currently employed by? *',
        },
        {
          name: 'placeholder',
          type: 'text',
          defaultValue: 'Portillos',
        },
      ],
    },
    {
      name: 'volunteerOrgsQuestion',
      type: 'group',
      label: 'Volunteer Organizations Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: 'What other organizations do you volunteer with?',
        },
        {
          name: 'placeholder',
          type: 'text',
          defaultValue: 'American Cancer Society',
        },
        {
          name: 'addButtonText',
          type: 'text',
          defaultValue: '+ ADD ANOTHER',
        },
      ],
    },
    {
      name: 'radioExperienceQuestion',
      type: 'group',
      label: 'Radio Experience Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: 'Have you worked with a radio station before? *',
        },
        {
          name: 'followUpLabel',
          type: 'text',
          label: 'Follow-up Question (if yes)',
          defaultValue: 'What radio stations have you worked with?',
        },
        {
          name: 'followUpPlaceholder',
          type: 'text',
          defaultValue: 'WLUW',
        },
      ],
    },
    {
      name: 'specialSkillsQuestion',
      type: 'group',
      label: 'Special Skills Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: 'What special skills do you have?',
        },
        {
          name: 'options',
          type: 'array',
          label: 'Skills Options',
          defaultValue: [
            { value: 'Fundraising' },
            { value: 'Sales' },
            { value: 'Other' },
            { value: 'Wants' },
            { value: 'Journalism' },
            { value: 'Photography' },
            { value: 'Things' },
            { value: 'To' },
            { value: 'Marketing' },
            { value: 'Politics' },
            { value: 'Chirp' },
            { value: 'Track' },
          ],
          fields: [
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'hearAboutChirpQuestion',
      type: 'group',
      label: 'How Did You Hear About CHIRP Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: 'How did you hear about CHIRP?',
        },
        {
          name: 'options',
          type: 'array',
          label: 'Source Options',
          defaultValue: [
            { value: 'This' },
            { value: 'Other' },
            { value: 'Wants' },
            { value: 'That' },
            { value: 'Things' },
            { value: 'To' },
            { value: 'Something' },
            { value: 'Chirp' },
            { value: 'Track' },
          ],
          fields: [
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'interestsQuestion',
      type: 'group',
      label: 'Interests Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: 'What are you interested in doing?',
        },
        {
          name: 'options',
          type: 'array',
          label: 'Interest Options',
          defaultValue: [
            { value: 'DJ' },
            { value: 'Content writing' },
            { value: 'Event planning' },
            { value: 'Marketing' },
            { value: 'Community radio' },
            { value: 'Event working' },
            { value: 'Interviews' },
            { value: 'Fundraising' },
            { value: 'Other' },
          ],
          fields: [
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'wantsToDJQuestion',
      type: 'group',
      label: 'DJ Interest Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: 'Do you want to be a DJ or on-air sub?',
        },
      ],
    },
    {
      name: 'djAvailabilityQuestion',
      type: 'group',
      label: 'DJ Availability Question',
      fields: [
        {
          name: 'label',
          type: 'text',
          defaultValue: "What's your DJ availability?",
        },
        {
          name: 'options',
          type: 'array',
          label: 'Time Slot Options',
          defaultValue: [
            { value: 'Weekday mornings' },
            { value: 'Weekend mornings' },
            { value: 'Weekday day' },
            { value: 'Weekend day' },
            { value: 'Weekday evening' },
            { value: 'Weekend evening' },
            { value: 'Weekday night' },
            { value: 'Weekend night' },
          ],
          fields: [
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'formActions',
      type: 'group',
      label: 'Form Actions',
      fields: [
        {
          name: 'cancelButtonText',
          type: 'text',
          defaultValue: 'Cancel',
        },
        {
          name: 'saveButtonText',
          type: 'text',
          defaultValue: 'Save Changes',
        },
      ],
    },
  ],
}
